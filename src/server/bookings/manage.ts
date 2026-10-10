import "server-only";

/**
 * Kundens länk `/r/[token]` (WP-16, D-029): se och avboka en bokning med
 * bara länkens token.
 *
 * Uppslaget `manage_token_hash → business_id` är den enda frågan här utan
 * ett `business_id`-filter: token är det enda kunden har, och hashen är unik
 * (`bookings.manage_token_hash unique`). Uttryckligt, namngivet undantag i
 * `server/boundaries.test.ts` (IDEAS rad 47). Efter uppslaget är
 * `businessId` betrodd och all vidare SQL filtrerar på den (ARCHITECTURE
 * princip 3). Token loggas aldrig och skickas aldrig tillbaka.
 */
import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";
import { err, ok, type Result } from "@/server/scheduling/result";
import { manageTokenSchema } from "@/server/scheduling/schemas";
import type { BookingStatus } from "@/server/scheduling/types";

import { cancelBooking } from "./cancel";
import {
  CHANGEABLE,
  customerCancelNeedsApproval,
  insideCancelWindow,
  toCancelApproval,
} from "./row";
import { hashManageToken } from "./token";
import type { BookingError } from "./types";

/** Det kundsidan behöver — inga kunduppgifter, inget id för kunden. */
export type ManagedBooking = {
  businessId: string;
  bookingId: string;
  business: {
    name: string;
    slug: string;
    phone: string | null;
    address: string | null;
    comuna: string;
    timezone: string;
  };
  serviceName: string;
  staffName: string;
  /** period (utan buffert), ISO UTC. */
  start: string;
  end: string;
  priceClp: number;
  status: BookingStatus;
  cancelWindowHours: number;
  /** Status `requested`/`confirmed`/`pending_payment` och `now` ≤ start −
   * cancel_window_hours, ELLER (WP-56) avbokningen blir en förfrågan
   * (`cancelNeedsApproval`). */
  canCancel: boolean;
  /** WP-56: avbokar kunden nu blir det en förfrågan som företaget måste
   * godkänna (`cancelByToken` svarar då `pending: true`). Sätts alltid av
   * `loadBookingByToken`; valfri bara för äldre fixturer (saknas = false). */
  cancelNeedsApproval?: boolean;
  /** WP-64 (D-044): betalning online, härledd ur Stripe-raden. Saknas = ingen. */
  payment?: "reserved" | "paid" | "refund";
};

/** WP-56: kundens avbokning via länken. `pending: true` = blev en
 * avbokningsförfrågan (`cancel_requested`), väntar på företagets svar;
 * saknas = avbokad (eller redan avbokad). */
export type CustomerCancelOutcome = { bookingId: string; pending?: true };

/** Ogiltigt format → `undefined` utan att fråga databasen. */
function parseToken(token: string): string | undefined {
  const p = manageTokenSchema.safeParse(token);
  return p.success ? p.data : undefined;
}

/** Det namngivna undantaget: uppslag på bara hashen (unik). */
async function businessIdForToken(
  q: Queryable,
  token: string,
): Promise<string | undefined> {
  const r = await q.query<{ business_id: string }>(
    `select bk.business_id from public.bookings bk
      where bk.manage_token_hash = $1`,
    [hashManageToken(token)],
  );
  return r.rows[0]?.business_id;
}

type DetailRow = {
  id: string;
  status: BookingStatus;
  price_clp: number;
  s: number;
  pe: number;
  service_name: string;
  staff_name: string;
  business_name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  comuna: string;
  timezone: string;
  cancel_window_hours: number;
  cancel_approval: string;
};

/** WP-64 (D-044): kundens betalning online för bokningen, som kunden ser den. */
async function onlinePaymentState(
  q: Queryable,
  businessId: string,
  bookingId: string,
  bookingStatus: string,
): Promise<"reserved" | "paid" | "refund" | undefined> {
  const r = await q.query<{ status: string }>(
    `select status from public.stripe_checkouts
      where business_id = $1 and booking_id = $2
        and status in ('authorized', 'captured', 'voided', 'refunded')
      order by created_at desc limit 1`,
    [businessId, bookingId],
  );
  const st = r.rows[0]?.status;
  if (!st) return undefined;
  if (st === "voided" || st === "refunded") return "refund";
  if (bookingStatus === "cancelled") return "refund";
  return st === "authorized" ? "reserved" : "paid";
}

/**
 * Bokningen bakom länken, eller `null` om token är okänd (eller har
 * roterats bort av en flytt, D-029). `now` injiceras (deterministiska tester).
 */
export async function loadBookingByToken(
  token: string,
  now: Date,
): Promise<ManagedBooking | null> {
  const t = parseToken(token);
  if (!t) return null;
  return withServiceTx(async (q) => {
    const businessId = await businessIdForToken(q, t);
    if (!businessId) return null;
    const r = await q.query<DetailRow>(
      `select bk.id, bk.status::text as status, bk.price_clp,
              extract(epoch from lower(bk.period))::float8 * 1000 as s,
              extract(epoch from upper(bk.period))::float8 * 1000 as pe,
              sv.name as service_name, st.name as staff_name,
              b.name as business_name, b.slug, b.phone, b.address, b.comuna,
              b.timezone, b.cancel_window_hours, b.cancel_approval
         from public.bookings bk
         join public.businesses b on b.id = bk.business_id
         join public.services sv
           on sv.business_id = bk.business_id and sv.id = bk.service_id
         join public.staff st
           on st.business_id = bk.business_id and st.id = bk.staff_id
        where bk.business_id = $1 and b.id = $1 and bk.manage_token_hash = $2`,
      [businessId, hashManageToken(t)],
    );
    const x = r.rows[0];
    if (!x) return null;
    const payment = await onlinePaymentState(q, businessId, x.id, x.status);
    const start = Math.round(x.s);
    const cancelNeedsApproval = customerCancelNeedsApproval(
      {
        start,
        cancelWindowHours: x.cancel_window_hours,
        cancelApproval: toCancelApproval(x.cancel_approval),
        status: x.status,
      },
      now,
    );
    return {
      businessId,
      bookingId: x.id,
      business: {
        name: x.business_name,
        slug: x.slug,
        phone: x.phone,
        address: x.address,
        comuna: x.comuna,
        timezone: x.timezone,
      },
      serviceName: x.service_name,
      staffName: x.staff_name,
      start: new Date(start).toISOString(),
      end: new Date(Math.round(x.pe)).toISOString(),
      priceClp: x.price_clp,
      status: x.status,
      cancelWindowHours: x.cancel_window_hours,
      canCancel:
        cancelNeedsApproval ||
        (CHANGEABLE.includes(x.status) &&
          insideCancelWindow(
            { start, cancelWindowHours: x.cancel_window_hours },
            now,
          )),
      cancelNeedsApproval,
      ...(payment ? { payment } : {}),
    };
  });
}

/**
 * Kundens avbokning via länken. Samma motor som allt annat (`cancelBooking`
 * med `actor: customer` + token): fönstret, idempotens (redan avbokad → ok
 * utan nytt meddelande) och `cancelled`-händelsen efter commit.
 * Okänd token → `not_found`.
 */
export async function cancelByToken(
  token: string,
  now: Date,
): Promise<Result<CustomerCancelOutcome, BookingError>> {
  const t = parseToken(token);
  if (!t) return err("not_found");
  const businessId = await withServiceTx((q) => businessIdForToken(q, t));
  if (!businessId) return err("not_found");
  const r = await cancelBooking(
    { manageToken: t },
    { businessId, actor: { kind: "customer" }, now },
  );
  if (!r.ok) return r;
  return ok(
    r.value.pending
      ? { bookingId: r.value.bookingId, pending: true }
      : { bookingId: r.value.bookingId },
  );
}
