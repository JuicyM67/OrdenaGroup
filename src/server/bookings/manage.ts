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
import type { PublicConsent } from "@/components/booking/types";
import { LEGAL_VERSION } from "@/i18n/legal/types";
import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";
import {
  hasWhatsAppConsentIn,
  recordWhatsAppConsentIn,
} from "@/server/privacy/whatsapp-consent";
import {
  loadServiceConsentsIn,
  pendingConsentsForCustomerIn,
  recordInformedConsentsIn,
} from "@/server/records/public-consent";
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
  /** D-063: kunden har ett aktivt WhatsApp-samtycke hos företaget (kan
   * återkallas härifrån). Valfri bara för äldre fixturer (saknas = false). */
  whatsappConsent?: boolean;
  /** WP-88 (D-074): consentimientos som bokningens tjänst kräver och som
   * kunden inte godkänt i aktuell version (godkänns härifrån). Valfri bara
   * för äldre fixturer (saknas = inga). */
  pendingConsents?: PublicConsent[];
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
  customer_id: string;
  service_id: string;
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
      `select bk.id, bk.customer_id, bk.service_id, bk.status::text as status, bk.price_clp,
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
    const start = Math.round(x.s);
    const whatsappConsent = await hasWhatsAppConsentIn(
      q,
      businessId,
      x.customer_id,
    );
    // WP-88 (D-074): bara för bokningar som inte är avbokade.
    const pendingConsents =
      x.status === "cancelled"
        ? []
        : await pendingConsentsForCustomerIn(
            q,
            businessId,
            x.customer_id,
            x.service_id,
          );
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
      whatsappConsent,
      ...(pendingConsents.length > 0 ? { pendingConsents } : {}),
    };
  });
}

/**
 * D-063 (Ley 21.719): kunden återkallar sitt WhatsApp-samtycke från
 * länken. Loggas som `consent_events` (kind `whatsapp`, `granted: false`);
 * därefter går kundens meddelanden från företaget som e-post (workern
 * avgör kanalen vid varje utskick). Idempotent: utan aktivt samtycke
 * loggas inget nytt. Okänd token → `not_found`.
 */
export async function revokeWhatsAppByToken(
  token: string,
): Promise<Result<{ revoked: boolean }, "not_found">> {
  const t = parseToken(token);
  if (!t) return err("not_found");
  return withServiceTx(async (q) => {
    const businessId = await businessIdForToken(q, t);
    if (!businessId) return err("not_found");
    const r = await q.query<{ customer_id: string }>(
      `select bk.customer_id from public.bookings bk
        where bk.business_id = $1 and bk.manage_token_hash = $2`,
      [businessId, hashManageToken(t)],
    );
    const customerId = r.rows[0]?.customer_id;
    if (!customerId) return err("not_found");
    if (!(await hasWhatsAppConsentIn(q, businessId, customerId))) {
      return ok({ revoked: false });
    }
    await recordWhatsAppConsentIn(q, {
      businessId,
      customerId,
      granted: false,
      version: LEGAL_VERSION,
    });
    return ok({ revoked: true });
  });
}

/**
 * WP-88 (D-074): kunden godkänner en consentimiento från sin länk. Mallen
 * måste vara en av dem bokningens tjänst kräver och versionen den aktuella
 * (annars `outdated`: texten ändrades medan sidan var öppen). Loggas i
 * `consent_events` (källa `manage_link`, bokningen satt). Idempotent.
 */
export async function acceptInformedConsentByToken(
  token: string,
  input: { templateId: string; version: string },
): Promise<Result<{ accepted: true }, "not_found" | "outdated">> {
  const t = parseToken(token);
  if (!t) return err("not_found");
  return withServiceTx(async (q) => {
    const businessId = await businessIdForToken(q, t);
    if (!businessId) return err("not_found");
    const r = await q.query<{
      id: string;
      customer_id: string;
      service_id: string;
      status: string;
    }>(
      `select bk.id, bk.customer_id, bk.service_id, bk.status::text as status
         from public.bookings bk
        where bk.business_id = $1 and bk.manage_token_hash = $2`,
      [businessId, hashManageToken(t)],
    );
    const bk = r.rows[0];
    if (!bk || bk.status === "cancelled") return err("not_found");
    const required =
      (await loadServiceConsentsIn(q, businessId, [bk.service_id]))[
        bk.service_id
      ] ?? [];
    const c = required.find((x) => x.templateId === input.templateId);
    if (!c) return err("not_found");
    if (c.version !== input.version) return err("outdated");
    await recordInformedConsentsIn(q, {
      businessId,
      customerId: bk.customer_id,
      bookingId: bk.id,
      items: [{ templateId: c.templateId, version: c.version }],
      source: "manage_link",
    });
    return ok({ accepted: true });
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
