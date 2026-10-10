import "server-only";

import type Stripe from "stripe";

import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";

import { getStripe, stripeEnabled } from "./client";
import { handleCheckoutExpired } from "./checkout";

/**
 * WP-64 (D-044): håller Stripe-betalningen i takt med bokningen. EN idempotent
 * funktion, `reconcileBookingPayment`, anropas från webhooken, efter bekräfta/
 * neka/avboka och av cron-passet som säkerhetsnät. Stripe är sanningen: vi
 * läser alltid PaymentIntent från API:t innan vi agerar.
 *
 *  - kort reserverat + bokningen bekräftad      -> dra (capture)
 *  - kort reserverat + bokningen avbokad/nekad  -> släpp reservationen (inget dras, ingen avgift)
 *  - kort draget     + bokningen avbokad        -> återbetala (refund + återbetald plattformsavgift)
 *  - kort reserverat + bokningen väntar (requested) -> inget (förfrågan avgörs inom 24 h,
 *    långt före kortreservationens 7 dagar)
 * No-show behåller betalningen (samma regel som kontant, D-022).
 */

type CheckoutRow = {
  id: string;
  business_id: string;
  booking_id: string;
  stripe_account_id: string;
  payment_intent_id: string | null;
  amount_minor: number;
  status: string;
};

function isInvalidRequest(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { type?: string }).type === "StripeInvalidRequestError"
  );
}

async function setStatus(
  q: Queryable,
  id: string,
  status: string,
): Promise<void> {
  await q.query(
    `update public.stripe_checkouts set status = $2 where id = $1`,
    [id, status],
  );
}

/** Kassaraden (Caja): metod 'stripe', betald. Idempotent på (metod, provider_ref). */
async function recordCaptured(
  q: Queryable,
  row: CheckoutRow,
  paymentIntentId: string,
  now: Date,
): Promise<void> {
  await setStatus(q, row.id, "captured");
  await q.query(
    `insert into public.payments
       (business_id, booking_id, kind, method, amount_clp, status, provider_ref, paid_at)
     values ($1, $2, 'full', 'stripe', $3, 'approved', $4, $5)
     on conflict (method, provider_ref) where provider_ref is not null do nothing`,
    [row.business_id, row.booking_id, row.amount_minor, paymentIntentId, now],
  );
}

async function recordRefunded(
  q: Queryable,
  row: CheckoutRow,
  paymentIntentId: string,
): Promise<void> {
  await setStatus(q, row.id, "refunded");
  await q.query(
    `update public.payments set status = 'refunded'
      where business_id = $1 and booking_id = $2
        and method = 'stripe' and provider_ref = $3`,
    [row.business_id, row.booking_id, paymentIntentId],
  );
}

async function reconcileRow(
  q: Queryable,
  stripe: Stripe,
  row: CheckoutRow,
  bookingStatus: string,
  now: Date,
): Promise<void> {
  if (!row.payment_intent_id) return;
  const opts = { stripeAccount: row.stripe_account_id };
  const pi = await stripe.paymentIntents.retrieve(
    row.payment_intent_id,
    { expand: ["latest_charge"] },
    opts,
  );
  const cancelled = bookingStatus === "cancelled";

  if (pi.status === "requires_capture") {
    if (cancelled) {
      await stripe.paymentIntents.cancel(
        pi.id,
        { cancellation_reason: "requested_by_customer" },
        opts,
      );
      await setStatus(q, row.id, "voided");
      return;
    }
    if (bookingStatus === "requested") return; // väntar på företagets svar
    try {
      await stripe.paymentIntents.capture(
        pi.id,
        {},
        { ...opts, idempotencyKey: `capture:${row.id}` },
      );
      await recordCaptured(q, row, pi.id, now);
    } catch (e) {
      // Reservationen kan ha löpt ut (7 dagar) eller nekats: kunden är inte
      // debiterad, bokningen står kvar obetald. Nätverksfel kastas om och
      // försöks igen av nästa pass.
      if (!isInvalidRequest(e)) throw e;
      await setStatus(q, row.id, "failed");
    }
    return;
  }

  if (pi.status === "succeeded") {
    const charge =
      typeof pi.latest_charge === "object" ? pi.latest_charge : null;
    if (charge?.refunded) {
      await recordRefunded(q, row, pi.id);
      return;
    }
    if (row.status !== "captured") await recordCaptured(q, row, pi.id, now);
    if (cancelled) {
      await stripe.refunds.create(
        { payment_intent: pi.id, refund_application_fee: true },
        { ...opts, idempotencyKey: `refund:${row.id}` },
      );
      await recordRefunded(q, row, pi.id);
    }
    return;
  }

  if (pi.status === "canceled") await setStatus(q, row.id, "voided");
}

export async function reconcileBookingPayment(
  businessId: string,
  bookingId: string,
  now: Date,
): Promise<void> {
  if (!stripeEnabled()) return;
  const stripe = getStripe();
  await withServiceTx(async (q) => {
    await q.query(
      "select pg_advisory_xact_lock(hashtextextended('stripe-reconcile:' || $1::text || ':' || $2::text, 0))",
      [businessId, bookingId],
    );
    const b = await q.query<{ status: string }>(
      `select status::text as status from public.bookings
        where business_id = $1 and id = $2`,
      [businessId, bookingId],
    );
    const bookingStatus = b.rows[0]?.status;
    if (!bookingStatus) return;
    const rows = await q.query<CheckoutRow>(
      `select id, business_id, booking_id, stripe_account_id, payment_intent_id,
              amount_minor, status
         from public.stripe_checkouts
        where business_id = $1 and booking_id = $2
          and status in ('authorized', 'captured')`,
      [businessId, bookingId],
    );
    for (const row of rows.rows) {
      await reconcileRow(q, stripe, row, bookingStatus, now);
    }
  });
}

/** Best effort efter bekräfta/neka/avboka: får aldrig fälla anroparen. */
export function reconcileSoon(
  businessId: string,
  bookingId: string,
  now: Date,
): void {
  void reconcileBookingPayment(businessId, bookingId, now).catch(() => {
    // Cron-passet (`runStripeSweep`) tar det nästa gång.
  });
}

/** Kunden har betalat/reserverat: läs sessionen från Stripe och uppdatera raden. */
export async function handleCheckoutCompleted(
  sessionId: string,
  accountId: string,
  now: Date,
): Promise<void> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(
    sessionId,
    { expand: ["payment_intent"] },
    { stripeAccount: accountId },
  );
  const pi =
    typeof session.payment_intent === "object" ? session.payment_intent : null;
  if (!pi) return;
  const target = await withServiceTx(async (q) => {
    await q.query(
      "select pg_advisory_xact_lock(hashtextextended('stripe-session:' || $1::text, 0))",
      [sessionId],
    );
    const r = await q.query<CheckoutRow>(
      `select id, business_id, booking_id, stripe_account_id, payment_intent_id,
              amount_minor, status
         from public.stripe_checkouts
        where session_id = $1 and stripe_account_id = $2`,
      [sessionId, accountId],
    );
    const row = r.rows[0];
    if (!row) return undefined;
    if (row.status !== "open" && row.status !== "expired") return row; // redan hanterad
    await q.query(
      `update public.stripe_checkouts set payment_intent_id = $2 where id = $1`,
      [row.id, pi.id],
    );
    row.payment_intent_id = pi.id;
    if (pi.amount !== row.amount_minor) {
      // Belopp från Stripe stämmer inte med serverns: släpp reservationen.
      if (pi.status === "requires_capture") {
        await stripe.paymentIntents.cancel(
          pi.id,
          {},
          { stripeAccount: accountId },
        );
      }
      await setStatus(q, row.id, "failed");
      return undefined;
    }
    if (pi.status === "requires_capture")
      await setStatus(q, row.id, "authorized");
    else if (pi.status === "succeeded")
      await recordCaptured(q, row, pi.id, now);
    return row;
  });
  if (target) {
    await reconcileBookingPayment(target.business_id, target.booking_id, now);
  }
}

/** Betalningen har avbrutits hos Stripe (släppt reservation). */
export async function handlePaymentCanceled(
  paymentIntentId: string,
): Promise<void> {
  await withServiceTx(async (q) => {
    await q.query(
      `update public.stripe_checkouts set status = 'voided'
        where payment_intent_id = $1 and status in ('open', 'authorized')`,
      [paymentIntentId],
    );
  });
}

/** Fullständig återbetalning gjord (av oss eller direkt i Stripe-dashboarden). */
export async function handleChargeRefunded(
  paymentIntentId: string,
  accountId: string,
): Promise<void> {
  const pi = await getStripe().paymentIntents.retrieve(
    paymentIntentId,
    { expand: ["latest_charge"] },
    { stripeAccount: accountId },
  );
  const charge = typeof pi.latest_charge === "object" ? pi.latest_charge : null;
  if (!charge?.refunded) return; // delåterbetalning: kassaraden är oförändrad
  await withServiceTx(async (q) => {
    const r = await q.query<CheckoutRow>(
      `select id, business_id, booking_id, stripe_account_id, payment_intent_id,
              amount_minor, status
         from public.stripe_checkouts
        where payment_intent_id = $1 and stripe_account_id = $2`,
      [paymentIntentId, accountId],
    );
    const row = r.rows[0];
    if (row) await recordRefunded(q, row, paymentIntentId);
  });
}

const SWEEP_LIMIT = 25;
/** Sessionen lever 31 min; efter 35 min har webhooken i normalfallet redan kommit. */
const OPEN_STALE_MINUTES = 35;

/**
 * Cron-passet (`/api/cron/outbox`): fångar det webhooken missat — bokningar
 * vars betalning ska dras/släppas/återbetalas, och sessioner som fastnat som
 * "open". Ett fel för en bokning stoppar aldrig resten.
 */
export async function runStripeSweep(
  now: Date,
): Promise<{ reconciled: number; sessions: number }> {
  if (!stripeEnabled()) return { reconciled: 0, sessions: 0 };
  const { bookings, sessions } = await withServiceTx(async (q) => {
    const b = await q.query<{ business_id: string; booking_id: string }>(
      `select distinct sc.business_id, sc.booking_id
         from public.stripe_checkouts sc
         join public.bookings bk
           on bk.business_id = sc.business_id and bk.id = sc.booking_id
        where (sc.status = 'authorized' and bk.status::text <> 'requested')
           or (sc.status in ('authorized', 'captured') and bk.status::text = 'cancelled')
        limit $1`,
      [SWEEP_LIMIT],
    );
    const s = await q.query<{ session_id: string; stripe_account_id: string }>(
      `select session_id, stripe_account_id
         from public.stripe_checkouts
        where status = 'open'
          and created_at < $1::timestamptz - $2 * interval '1 minute'
        limit $3`,
      [now, OPEN_STALE_MINUTES, SWEEP_LIMIT],
    );
    return { bookings: b.rows, sessions: s.rows };
  });
  let reconciled = 0;
  for (const b of bookings) {
    try {
      await reconcileBookingPayment(b.business_id, b.booking_id, now);
      reconciled += 1;
    } catch {
      // nästa pass
    }
  }
  let handled = 0;
  for (const s of sessions) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(
        s.session_id,
        {},
        { stripeAccount: s.stripe_account_id },
      );
      if (session.status === "complete") {
        await handleCheckoutCompleted(s.session_id, s.stripe_account_id, now);
      } else if (session.status === "expired") {
        await handleCheckoutExpired(s.session_id, now);
      }
      handled += 1;
    } catch {
      // nästa pass
    }
  }
  return { reconciled, sessions: handled };
}

/** `payment_intent.succeeded` m.fl.: slå upp bokningen på PaymentIntent och stäm av. */
export async function reconcileByPaymentIntent(
  paymentIntentId: string,
  accountId: string,
  now: Date,
): Promise<void> {
  const row = await withServiceTx(async (q) => {
    const r = await q.query<{ business_id: string; booking_id: string }>(
      `select business_id, booking_id from public.stripe_checkouts
        where payment_intent_id = $1 and stripe_account_id = $2`,
      [paymentIntentId, accountId],
    );
    return r.rows[0];
  });
  if (row) await reconcileBookingPayment(row.business_id, row.booking_id, now);
}
