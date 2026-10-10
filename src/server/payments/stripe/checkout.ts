import "server-only";

import { createHash } from "node:crypto";

import { marketConfig } from "@/config/market";
import { queryString } from "@/config/url-params";
import {
  ONLINE_PAYMENT_MIN_MINOR,
  platformFeeMinor,
} from "@/config/platform-fee";
import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";
import { enqueueBookingEventIn, kickOutbox } from "@/server/messaging/outbox";
import { emitWaitlistEvents, type WaitlistEvent } from "@/server/waitlist";
import { onSlotFreed } from "@/server/waitlist/match";

import { appBaseUrl, getStripe, stripeEnabled } from "./client";

/**
 * WP-64 (D-044): betalning via Stripe Checkout (hostad, redirect — ingen
 * Stripe.js på bokningssidan). **Direct charge** på företagets Express-konto:
 * företaget är säljare, plattformen tar `application_fee_amount`. Kortet
 * *reserveras* (`capture_method: manual`) och dras först när bokningen är
 * bekräftad (se `reconcile.ts`). Belopp = serverns pris minus rabatt.
 */

export type OnlinePaymentMode = "off" | "optional" | "required";

/** Stripe kräver att sessionen lever minst 30 min; vi tar 31. */
const SESSION_TTL_MINUTES = 31;

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; code: "unavailable" | "not_payable" | "failed" };

type BookingRow = {
  status: string;
  amount: number;
  service_name: string;
  business_name: string;
  slug: string;
  plan: string;
  online_payment: OnlinePaymentMode;
  customer_email: string | null;
  stripe_account_id: string | null;
  charges_enabled: boolean | null;
};

type ExistingRow = {
  id: string;
  status: string;
  session_id: string;
  stripe_account_id: string;
};

/**
 * Betalningsläget för ett företag som bokningssidan ska visa: bara
 * `optional`/`required` när Stripe är på och kontot kan ta betalt.
 */
export async function effectiveOnlinePayment(
  q: Queryable,
  businessId: string,
): Promise<OnlinePaymentMode> {
  if (!stripeEnabled()) return "off";
  const r = await q.query<{ online_payment: OnlinePaymentMode; ok: boolean }>(
    `select b.online_payment,
            coalesce(sa.charges_enabled, false) as ok
       from public.businesses b
       left join public.stripe_accounts sa on sa.business_id = b.id
      where b.id = $1`,
    [businessId],
  );
  const row = r.rows[0];
  return row?.ok ? row.online_payment : "off";
}

/** Deterministisk uuid för checkout-raden: ett omförsök efter ett tappat svar
 * ger exakt samma Stripe-parametrar (idempotensnyckeln kräver det). */
function checkoutUuid(bookingId: string, n: number): string {
  const h = createHash("sha256")
    .update(`checkout:${bookingId}:${String(n)}`)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Sessionens slut, avrundat till 10-minutersblock så att omförsök inom
 * blocket får identiska parametrar; alltid 31-41 min fram (Stripe kräver >= 30). */
function sessionExpiresAt(now: Date): number {
  const bucket = 10 * 60;
  const t = Math.floor(now.getTime() / 1000 / bucket) * bucket;
  return t + (SESSION_TTL_MINUTES + 10) * 60;
}

export async function createCheckoutForBooking(input: {
  businessId: string;
  bookingId: string;
  now: Date;
}): Promise<CheckoutResult> {
  if (!stripeEnabled()) return { ok: false, code: "unavailable" };
  const { businessId, bookingId } = input;
  try {
    // Allt under ett advisory-lås per bokning: dubbelklick serialiseras och
    // den andra anropet återanvänder den öppna sessionen.
    return await withServiceTx(async (q): Promise<CheckoutResult> => {
      await q.query(
        "select pg_advisory_xact_lock(hashtextextended('stripe-checkout:' || $1::text || ':' || $2::text, 0))",
        [businessId, bookingId],
      );
      const bres = await q.query<BookingRow>(
        `select bk.status::text as status,
                (bk.price_clp - bk.discount_clp)::int as amount,
                sv.name as service_name, b.name as business_name, b.slug,
                b.plan::text as plan, b.online_payment,
                c.email as customer_email,
                sa.stripe_account_id, sa.charges_enabled
           from public.bookings bk
           join public.businesses b on b.id = bk.business_id
           join public.services sv
             on sv.business_id = bk.business_id and sv.id = bk.service_id
           join public.customers c
             on c.business_id = bk.business_id and c.id = bk.customer_id
           left join public.stripe_accounts sa on sa.business_id = bk.business_id
          where bk.business_id = $1 and bk.id = $2`,
        [businessId, bookingId],
      );
      const ex = await q.query<ExistingRow>(
        `select id, status, session_id, stripe_account_id
           from public.stripe_checkouts
          where business_id = $1 and booking_id = $2
          order by created_at`,
        [businessId, bookingId],
      );
      const b = bres.rows[0];
      const existing = ex.rows;
      if (!b || !b.stripe_account_id || !b.charges_enabled) {
        return { ok: false, code: "unavailable" };
      }
      if (b.online_payment === "off") return { ok: false, code: "unavailable" };
      if (b.status !== "requested" && b.status !== "confirmed") {
        return { ok: false, code: "not_payable" };
      }
      if (
        existing.some(
          (e) => e.status === "authorized" || e.status === "captured",
        )
      ) {
        return { ok: false, code: "not_payable" };
      }
      if (b.amount < ONLINE_PAYMENT_MIN_MINOR) {
        return { ok: false, code: "not_payable" };
      }

      const stripe = getStripe();
      // Återanvänd en fortfarande öppen session (omförsök / dubbelklick).
      const open = existing.find((e) => e.status === "open");
      if (open) {
        const s = await stripe.checkout.sessions.retrieve(
          open.session_id,
          {},
          { stripeAccount: open.stripe_account_id },
        );
        if (s.status === "open" && s.url) return { ok: true, url: s.url };
      }

      const fee = platformFeeMinor(b.amount, b.plan);
      const checkoutId = checkoutUuid(bookingId, existing.length);
      const base = appBaseUrl();
      // Ingen kundtoken i URL:en hos Stripe: kunden landar på bokningssidan och
      // får sin personliga länk i bekräftelsen.
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          allowed_payment_method_types: ["card"],
          locale: "sv",
          client_reference_id: bookingId,
          ...(b.customer_email ? { customer_email: b.customer_email } : {}),
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: marketConfig.currency.toLowerCase(),
                unit_amount: b.amount,
                product_data: {
                  name: b.service_name,
                  description: b.business_name,
                },
              },
            },
          ],
          payment_intent_data: {
            capture_method: "manual",
            ...(fee > 0 ? { application_fee_amount: fee } : {}),
            metadata: { booking_id: bookingId, business_id: businessId },
          },
          metadata: { booking_id: bookingId, business_id: businessId },
          expires_at: sessionExpiresAt(input.now),
          success_url: `${base}/${b.slug}${queryString("pago", "ok")}`,
          cancel_url: `${base}/api/checkout/cancel?c=${checkoutId}`,
        },
        {
          stripeAccount: b.stripe_account_id,
          idempotencyKey: `checkout:${bookingId}:${String(existing.length)}`,
        },
      );
      if (!session.url) return { ok: false, code: "failed" };

      await q.query(
        `insert into public.stripe_checkouts
           (id, business_id, booking_id, stripe_account_id, session_id,
            amount_minor, fee_minor, currency, status, mode)
         values ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9)
         on conflict (session_id) do nothing`,
        [
          checkoutId,
          businessId,
          bookingId,
          b.stripe_account_id,
          session.id,
          b.amount,
          fee,
          marketConfig.currency.toLowerCase(),
          b.online_payment,
        ],
      );
      return { ok: true, url: session.url };
    });
  } catch {
    return { ok: false, code: "failed" };
  }
}

type FreedRow = { staff_id: string; s: number; be: number };

/**
 * Obligatorisk betalning som aldrig kom (sessionen gick ut / kunden avbröt):
 * bokningen släpps så tiden blir ledig. Händelsen köas i SAMMA transaktion
 * (förfrågan -> "utgången", bekräftad -> "avbokad"); väntelistan får tiden.
 * Idempotent: gör ingenting om bokningen redan är avbokad eller betald.
 */
export async function cancelUnpaidBooking(
  businessId: string,
  bookingId: string,
  now: Date,
): Promise<boolean> {
  const waitlist: WaitlistEvent[] = [];
  const changed = await withServiceTx(async (q) => {
    waitlist.length = 0;
    const paid = await q.query(
      `select 1 from public.stripe_checkouts
        where business_id = $1 and booking_id = $2
          and status in ('open', 'authorized', 'captured')`,
      [businessId, bookingId],
    );
    // Betald, eller en öppen session finns fortfarande: släpp inte bokningen.
    if (paid.rows.length > 0) return false;
    // Radlåset först: förra statusen avgör vilket besked kunden får, och en
    // CTE med `for update` hoppas över av UPDATE i samma sats.
    const before = await q.query<{ status: string }>(
      `select status::text as status from public.bookings
        where business_id = $1 and id = $2 for update`,
      [businessId, bookingId],
    );
    const prev = before.rows[0]?.status;
    if (prev !== "requested" && prev !== "confirmed") return false;
    const r = await q.query<FreedRow>(
      `update public.bookings
          set status = 'cancelled', cancelled_at = $3,
              cancel_reason = 'payment_expired', pending_expires_at = null
        where business_id = $1 and id = $2
          and status in ('requested', 'confirmed')
        returning staff_id,
                  extract(epoch from lower(blocked))::float8 * 1000 as s,
                  extract(epoch from upper(blocked))::float8 * 1000 as be`,
      [businessId, bookingId, now],
    );
    const x = r.rows[0];
    if (!x) return false;
    await enqueueBookingEventIn(
      q,
      prev === "confirmed"
        ? { type: "cancelled", bookingId, businessId, by: "owner" }
        : {
            type: "declined",
            bookingId,
            businessId,
            reason: "expired",
          },
    );
    waitlist.push(
      ...(await onSlotFreed(q, {
        businessId,
        staffId: x.staff_id,
        start: Math.round(x.s),
        end: Math.round(x.be),
        now,
      })),
    );
    return true;
  });
  if (changed) {
    await emitWaitlistEvents(waitlist);
    void kickOutbox();
  }
  return changed;
}

/**
 * Sessionen gick ut utan betalning. Markerar checkouten och släpper bokningen
 * när betalning är obligatorisk.
 */
export async function handleCheckoutExpired(
  sessionId: string,
  now: Date,
): Promise<void> {
  const row = await withServiceTx(async (q) => {
    const r = await q.query<{
      business_id: string;
      booking_id: string;
      mode: OnlinePaymentMode;
    }>(
      `update public.stripe_checkouts sc
          set status = case when sc.status = 'open' then 'expired' else sc.status end
        where sc.session_id = $1
        returning sc.business_id, sc.booking_id, sc.mode`,
      [sessionId],
    );
    return r.rows[0];
  });
  if (row?.mode === "required") {
    await cancelUnpaidBooking(row.business_id, row.booking_id, now);
  }
}
