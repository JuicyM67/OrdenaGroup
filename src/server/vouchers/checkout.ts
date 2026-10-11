import "server-only";

import { randomInt } from "node:crypto";

import { brand } from "@/config/brand";
import { marketplaceEnabled } from "@/config/marketplace";
import { MARKETPLACE_FEE_BPS } from "@/config/platform-fee";
import { valesHref } from "@/config/routes";
import { pgErrorCode } from "@/server/db/errors";
import { getClientIp, hitRateLimit } from "@/server/db/rate-limit";
import { savepoint, withServiceTx } from "@/server/db/tx";
import { kickOutbox } from "@/server/messaging/outbox";
import {
  appBaseUrl,
  getStripe,
  stripeEnabled,
} from "@/server/payments/stripe/client";

import { generateVoucherCode } from "./rules";

/**
 * WP-69 (D-057): köp av värdebevis. Stripe Checkout som **direct charge på
 * företagets anslutna konto** (`stripeAccount`, D-044/D-008: företaget är
 * säljare) med `application_fee_amount` = `MARKETPLACE_FEE_BPS` (1 %).
 * Beloppet och avgiften räknas i databasen ur erbjudandet
 * (`private.voucher_open_order`), aldrig från klienten; samma anrop låser
 * erbjudandet och räknar upp `quantity_sold` (ingen översäljning).
 *
 * Värdebeviset skapas först när Stripe säger betalt (`fulfillVoucherSession`,
 * anropas av webhooken, retursidan och cron-svepet — idempotent).
 */

/** Stripe kräver att sessionen lever minst 30 min; vi tar 31. */
export const VOUCHER_SESSION_TTL_MINUTES = 31;

export type VoucherCheckoutResult =
  | { ok: true; url: string }
  | {
      ok: false;
      code: "unavailable" | "sold_out" | "rate_limited" | "failed";
    };

/** Köpet finns på den här installationen (SE, marknadsplatsen på, Stripe-nyckel). */
export function vouchersEnabled(): boolean {
  return marketplaceEnabled() && stripeEnabled();
}

type OpenOrderRow = {
  outcome: "created" | "reused" | "sold_out" | "unavailable";
  order_id: string | null;
  business_id: string | null;
  amount_minor: number | null;
  fee_minor: number | null;
  currency: string | null;
  stripe_account_id: string | null;
  session_id: string | null;
};

export async function createVoucherCheckout(input: {
  offerId: string;
  userId: string;
  email: string | null;
  now: Date;
}): Promise<VoucherCheckoutResult> {
  if (!vouchersEnabled()) return { ok: false, code: "unavailable" };
  // Säkerhetsgranskning S5: per konto och per erbjudande + IP (5 / 10 min) —
  // varje köpstart håller ett exemplar i 31 min.
  const ip = await getClientIp();
  const allowed =
    (await hitRateLimit({
      scope: "voucher:checkout:user",
      subject: input.userId,
      windowSeconds: 10 * 60,
      max: 5,
    })) &&
    (await hitRateLimit({
      scope: "voucher:checkout:offer-ip",
      subject: `${input.offerId}:${ip}`,
      windowSeconds: 10 * 60,
      max: 5,
    }));
  if (!allowed) return { ok: false, code: "rate_limited" };

  const opened = await withServiceTx(async (q) => {
    const r = await q.query<
      OpenOrderRow & { title: string; business_name: string; slug: string }
    >(
      `select x.*, o.title, b.name as business_name, o.slug
         from private.voucher_open_order($1, $2, $3, $4, $5) x
         left join public.offers o on o.id = $1
         left join public.businesses b on b.id = o.business_id`,
      [
        input.offerId,
        input.userId,
        MARKETPLACE_FEE_BPS,
        VOUCHER_SESSION_TTL_MINUTES,
        input.now,
      ],
    );
    return r.rows[0];
  });
  if (!opened || opened.outcome === "unavailable") {
    return { ok: false, code: "unavailable" };
  }
  if (opened.outcome === "sold_out") return { ok: false, code: "sold_out" };
  const orderId = opened.order_id!;
  const accountId = opened.stripe_account_id!;
  const stripe = getStripe();
  let createdSession: string | null = null;

  try {
    if (opened.outcome === "reused" && opened.session_id) {
      const s = await stripe.checkout.sessions.retrieve(
        opened.session_id,
        {},
        { stripeAccount: accountId },
      );
      if (s.status === "open" && s.url) return { ok: true, url: s.url };
      // Sessionen hann gå ut/betalas: svepet stänger ordern. Nytt försök.
      return { ok: false, code: "failed" };
    }

    const amount = opened.amount_minor!;
    const fee = opened.fee_minor!;
    const metadata = {
      kind: "voucher",
      order_id: orderId,
      business_id: opened.business_id!,
      offer_id: input.offerId,
    };
    const base = appBaseUrl();
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        allowed_payment_method_types: ["card"],
        locale: "sv",
        client_reference_id: orderId,
        ...(input.email ? { customer_email: input.email } : {}),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: opened.currency!.toLowerCase(),
              unit_amount: amount,
              product_data: {
                name: opened.title,
                description: opened.business_name,
              },
            },
          },
        ],
        payment_intent_data: {
          ...(fee > 0 ? { application_fee_amount: fee } : {}),
          metadata,
        },
        metadata,
        expires_at:
          Math.floor(input.now.getTime() / 1000) +
          VOUCHER_SESSION_TTL_MINUTES * 60,
        success_url: `${base}${valesHref("cuenta")}?kop=klart&session={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/api/checkout/vardebevis?o=${orderId}`,
      },
      { stripeAccount: accountId, idempotencyKey: `voucher:${orderId}` },
    );
    createdSession = session.id;
    if (!session.url) throw new Error("voucher: session utan url");
    await withServiceTx((q) =>
      q.query(
        `update public.voucher_orders set session_id = $2
          where id = $1 and session_id is null`,
        [orderId, session.id],
      ),
    );
    return { ok: true, url: session.url };
  } catch {
    // K3: en session som hann skapas avslutas hos Stripe, så att ingen kan
    // betala en order som vi släpper här.
    if (createdSession) {
      const expired = await stripe.checkout.sessions
        .expire(createdSession, {}, { stripeAccount: accountId })
        .then(() => true)
        .catch(() => false);
      // Gick den inte att avsluta låter vi svepet avgöra (betald → värdebevis).
      if (!expired) return { ok: false, code: "failed" };
    }
    // Exemplaret lämnas tillbaka direkt. Ingen persondata loggas.
    await withServiceTx((q) =>
      q.query(`select private.voucher_release_order($1, 'failed')`, [orderId]),
    ).catch(() => undefined);
    return { ok: false, code: "failed" };
  }
}

type OrderRow = {
  id: string;
  business_id: string;
  stripe_account_id: string;
  session_id: string | null;
  payment_intent_id: string | null;
  status: string;
};

async function orderBySession(
  sessionId: string,
): Promise<OrderRow | undefined> {
  return withServiceTx(async (q) => {
    const r = await q.query<OrderRow>(
      `select id, business_id, stripe_account_id, session_id, payment_intent_id, status
         from public.voucher_orders where session_id = $1`,
      [sessionId],
    );
    return r.rows[0];
  });
}

export type FulfillOutcome = "created" | "already" | "pending" | "ignored";

/**
 * Sessionen hämtas alltid från Stripes API (D-044 p. 7). Kräver
 * `metadata.kind === "voucher"`, `payment_status === "paid"` och att order-id,
 * belopp, valuta och session stämmer med ordern (annars kastar
 * `private.voucher_fulfill` → webhooken svarar 500, synligt fel).
 */
export async function fulfillVoucherSession(
  sessionId: string,
  accountId: string,
  now: Date,
): Promise<FulfillOutcome> {
  const s = await getStripe().checkout.sessions.retrieve(
    sessionId,
    {},
    { stripeAccount: accountId },
  );
  if (s.metadata?.kind !== "voucher") return "ignored";
  if (s.payment_status !== "paid") return "pending";
  const orderId = s.metadata.order_id ?? "";
  const pi =
    typeof s.payment_intent === "string"
      ? s.payment_intent
      : (s.payment_intent?.id ?? null);
  const outcome = await withServiceTx(async (q) => {
    const own = await q.query<{ ok: boolean }>(
      `select (stripe_account_id = $2) as ok from public.voucher_orders where id = $1`,
      [orderId, accountId],
    );
    if (!own.rows[0]?.ok) {
      throw new Error("voucher: ordern hör inte till kontot");
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const r = await savepoint(q, () =>
          q.query<{ voucher_id: string; created: boolean }>(
            `select * from private.voucher_fulfill($1, $2, $3, $4, $5, $6, $7)`,
            [
              orderId,
              s.id,
              pi,
              s.amount_total,
              s.currency ?? "",
              generateVoucherCode(brand.voucherPrefix, randomInt),
              now,
            ],
          ),
        );
        return r.rows[0]?.created ? "created" : "already";
      } catch (e) {
        if (pgErrorCode(e) !== "23505") throw e; // kodkollision: ny kod
      }
    }
    throw new Error("voucher: ingen ledig kod");
  });
  if (outcome === "created") void kickOutbox();
  return outcome;
}

/** Webhooken (Connect): är det här en värdebevis-session? Då hanteras den
 * här och bokningsbetalningens hanterare hoppas över. */
export async function handleVoucherCheckoutEvent(
  type: "completed" | "expired",
  sessionId: string,
  accountId: string,
  now: Date,
): Promise<boolean> {
  const order = await orderBySession(sessionId);
  if (!order) return false;
  if (order.stripe_account_id !== accountId) return true; // inte vår, ignoreras
  if (type === "completed") {
    await fulfillVoucherSession(sessionId, accountId, now);
    return true;
  }
  const s = await getStripe().checkout.sessions.retrieve(
    sessionId,
    {},
    { stripeAccount: accountId },
  );
  if (s.status === "expired") {
    await withServiceTx((q) =>
      q.query(`select private.voucher_release_order($1, 'expired')`, [
        order.id,
      ]),
    );
  } else if (s.status === "complete") {
    await fulfillVoucherSession(sessionId, accountId, now);
  }
  return true;
}

/** `charge.refunded` / `charge.dispute.created` (Connect): PaymentIntent och
 * charge hämtas från Stripes API. Bara full återbetalning speglas. */
export async function handleVoucherPaymentEvent(
  kind: "refunded" | "disputed",
  paymentIntentId: string,
  accountId: string,
  now: Date,
): Promise<boolean> {
  const order = await withServiceTx(async (q) => {
    const r = await q.query<OrderRow>(
      `select id, business_id, stripe_account_id, session_id, payment_intent_id, status
         from public.voucher_orders
        where payment_intent_id = $1 and stripe_account_id = $2`,
      [paymentIntentId, accountId],
    );
    return r.rows[0];
  });
  if (!order) return false;
  if (kind === "refunded") {
    const pi = await getStripe().paymentIntents.retrieve(
      paymentIntentId,
      { expand: ["latest_charge"] },
      { stripeAccount: accountId },
    );
    const charge =
      typeof pi.latest_charge === "object" ? pi.latest_charge : null;
    if (!charge?.refunded) return true; // delåterbetalning: oförändrat
  }
  await withServiceTx((q) =>
    q.query(`select private.voucher_mark_payment($1, $2, $3)`, [
      paymentIntentId,
      kind,
      now,
    ]),
  );
  return true;
}

/** Kunden tryckte "tillbaka" i Checkout: avsluta sessionen hos Stripe och
 * lämna tillbaka exemplaret. Hann kunden betala behandlas det som betalt. */
export async function abandonVoucherOrder(
  orderId: string,
  userId: string,
  now: Date,
): Promise<string | undefined> {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return undefined;
  const row = await withServiceTx(async (q) => {
    const r = await q.query<OrderRow & { offer_slug: string }>(
      `select vo.id, vo.business_id, vo.stripe_account_id, vo.session_id,
              vo.payment_intent_id, vo.status, o.slug as offer_slug
         from public.voucher_orders vo
         join public.offers o on o.business_id = vo.business_id and o.id = vo.offer_id
        where vo.id = $1 and vo.user_id = $2`,
      [orderId, userId],
    );
    return r.rows[0];
  });
  if (!row) return undefined;
  if (row.status !== "open" || !row.session_id || !stripeEnabled()) {
    return row.offer_slug;
  }
  const stripe = getStripe();
  const opts = { stripeAccount: row.stripe_account_id };
  let s = await stripe.checkout.sessions.retrieve(row.session_id, {}, opts);
  if (s.status === "open") {
    try {
      s = await stripe.checkout.sessions.expire(row.session_id, {}, opts);
    } catch {
      s = await stripe.checkout.sessions.retrieve(row.session_id, {}, opts);
    }
  }
  if (s.status === "complete") {
    await fulfillVoucherSession(row.session_id, row.stripe_account_id, now);
  } else if (s.status === "expired") {
    await withServiceTx((q) =>
      q.query(`select private.voucher_release_order($1, 'expired')`, [row.id]),
    );
  }
  return row.offer_slug;
}

const SWEEP_LIMIT = 25;

/** "Ångra köp" som stått i `refunding` så här länge har kraschat mellan
 * `active` → `refunding` och Stripes svar (D-057). */
const REFUNDING_STALE_MINUTES = 15;

/**
 * Värdebevis som fastnat i `refunding` (processen dog mellan statusbytet och
 * Stripes svar i `withdrawVoucher`): fråga Stripe på företagets konto. Helt
 * återbetald → `refunded` (samma väg som "Ångra köp"); en återbetalning som
 * fortfarande behandlas → nästa pass; annars → `active` igen. Idempotent
 * (villkorade updates), högst `SWEEP_LIMIT` per pass, ett fel stoppar aldrig
 * resten. Returnerar antalet som lösts upp.
 */
export async function sweepStuckRefunds(now: Date): Promise<number> {
  const stuck = await withServiceTx(async (q) => {
    const r = await q.query<{
      id: string;
      payment_intent_id: string | null;
      stripe_account_id: string;
    }>(
      `select v.id, o.payment_intent_id, o.stripe_account_id
         from public.vouchers v
         join public.voucher_orders o on o.business_id = v.business_id and o.id = v.order_id
        where v.status = 'refunding'
          and v.updated_at <= $1::timestamptz - make_interval(mins => $2)
        order by v.updated_at
        limit $3`,
      [now, REFUNDING_STALE_MINUTES, SWEEP_LIMIT],
    );
    return r.rows;
  });
  let resolved = 0;
  for (const v of stuck) {
    try {
      let refunded = false;
      if (v.payment_intent_id) {
        const stripe = getStripe();
        const opts = { stripeAccount: v.stripe_account_id };
        const pi = await stripe.paymentIntents.retrieve(
          v.payment_intent_id,
          { expand: ["latest_charge"] },
          opts,
        );
        const charge =
          typeof pi.latest_charge === "object" ? pi.latest_charge : null;
        refunded = charge?.refunded === true;
        if (!refunded) {
          const list = await stripe.refunds.list(
            { payment_intent: v.payment_intent_id, limit: 10 },
            opts,
          );
          if (
            list.data.some(
              (x) => x.status === "pending" || x.status === "requires_action",
            )
          ) {
            continue; // Stripe behandlar fortfarande: nästa pass.
          }
        }
      }
      await withServiceTx((q) =>
        refunded
          ? q.query(
              `select private.voucher_mark_payment($1, 'withdrawn', $2)`,
              [v.payment_intent_id, now],
            )
          : q.query(
              `update public.vouchers set status = 'active'
                where id = $1 and status = 'refunding'`,
              [v.id],
            ),
      );
      resolved += 1;
    } catch {
      // Stripe eller databasen svarade inte: värdebeviset står kvar i
      // `refunding` och tas i nästa pass.
    }
  }
  return resolved;
}

/**
 * Cron-passet (`/api/cron/outbox`): öppna ordrar som webhooken missat (frågar
 * Stripe), utgångna värdebevis, genomförda besök och "Ångra köp" som fastnat
 * i `refunding`. Ett fel för en order ger backoff och stoppar aldrig resten.
 */
export async function runVoucherSweep(now: Date): Promise<{
  orders: number;
  expired: number;
  redeemed: number;
  refunding: number;
}> {
  const swept = await withServiceTx(async (q) => {
    const r = await q.query<{ expired: number; redeemed: number }>(
      `select * from private.voucher_sweep($1)`,
      [now],
    );
    return r.rows[0] ?? { expired: 0, redeemed: 0 };
  });
  if (!stripeEnabled()) return { orders: 0, refunding: 0, ...swept };
  const stale = await withServiceTx(async (q) => {
    const r = await q.query<OrderRow>(
      `select id, business_id, stripe_account_id, session_id, payment_intent_id, status
         from public.voucher_orders
        where status = 'open' and next_attempt_at <= $1
        order by next_attempt_at
        limit $2`,
      [now, SWEEP_LIMIT],
    );
    return r.rows;
  });
  let orders = 0;
  for (const o of stale) {
    try {
      if (!o.session_id) {
        await withServiceTx((q) =>
          q.query(`select private.voucher_release_order($1, 'failed')`, [o.id]),
        );
      } else {
        const s = await getStripe().checkout.sessions.retrieve(
          o.session_id,
          {},
          { stripeAccount: o.stripe_account_id },
        );
        if (s.status === "complete") {
          await fulfillVoucherSession(o.session_id, o.stripe_account_id, now);
        } else if (s.status === "expired") {
          await withServiceTx((q) =>
            q.query(`select private.voucher_release_order($1, 'expired')`, [
              o.id,
            ]),
          );
        } else {
          throw new Error("voucher: sessionen är fortfarande öppen");
        }
      }
      orders += 1;
    } catch {
      await withServiceTx((q) =>
        q.query(
          `update public.voucher_orders
              set attempts = attempts + 1,
                  next_attempt_at = $2::timestamptz + interval '1 minute' *
                    (case least(attempts, 3) when 0 then 1 when 1 then 5 when 2 then 15 else 60 end)
            where id = $1`,
          [o.id, now],
        ),
      ).catch(() => undefined);
    }
  }
  let refunding = 0;
  try {
    refunding = await sweepStuckRefunds(now);
  } catch {
    // Urvalet misslyckades: nästa pass.
  }
  return { orders, refunding, ...swept };
}

/** Visas köpknappen för företaget? (SE, Stripe på, kontot kan ta betalt.) */
export async function businessCanSellVouchers(
  businessId: string,
): Promise<boolean> {
  if (!vouchersEnabled()) return false;
  return withServiceTx(async (q) => {
    const r = await q.query<{ ok: boolean }>(
      `select coalesce(charges_enabled, false) as ok
         from public.stripe_accounts where business_id = $1`,
      [businessId],
    );
    return r.rows[0]?.ok ?? false;
  });
}

/** Retursidan (`?kop=klart&session=…`): skapa värdebeviset direkt om webhooken
 * inte hunnit, men bara för köparens egen order. */
export async function confirmVoucherReturn(
  userId: string,
  sessionId: string,
  now: Date,
): Promise<FulfillOutcome> {
  if (!stripeEnabled() || !/^cs_[A-Za-z0-9_]{1,250}$/.test(sessionId)) {
    return "ignored";
  }
  const order = await withServiceTx(async (q) => {
    const r = await q.query<{
      stripe_account_id: string;
      user_id: string;
      status: string;
    }>(
      `select stripe_account_id, user_id, status
         from public.voucher_orders where session_id = $1`,
      [sessionId],
    );
    return r.rows[0];
  });
  if (order?.user_id !== userId) return "ignored";
  // Webhooken hann före: inget anrop till Stripe behövs.
  if (order.status === "paid") return "already";
  return fulfillVoucherSession(sessionId, order.stripe_account_id, now);
}
