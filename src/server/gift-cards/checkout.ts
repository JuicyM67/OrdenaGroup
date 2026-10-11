import "server-only";

import { randomBytes, randomInt } from "node:crypto";

import { giftCardsMarket } from "@/config/gift-cards";
import { MARKETPLACE_FEE_BPS } from "@/config/platform-fee";
import { regaloHref } from "@/config/routes";
import type { GiftCardForm } from "@/lib/validation/gift-cards";
import { pgErrorCode } from "@/server/db/errors";
import { getClientIp, hitRateLimit } from "@/server/db/rate-limit";
import { savepoint, withServiceTx } from "@/server/db/tx";
import { kickOutbox } from "@/server/messaging/outbox";
import {
  appBaseUrl,
  getStripe,
  stripeEnabled,
} from "@/server/payments/stripe/client";

import { generateGiftCardCode } from "./rules";

/**
 * WP-77 (D-058): köp av presentkort på `/<slug>/presentkort`. Stripe Checkout
 * som direct charge på företagets konto (`stripeAccount`, som D-057) med
 * `application_fee_amount` = `MARKETPLACE_FEE_BPS` (1 %) och UTAN skattesats:
 * presentkortet är en flerfunktionsvoucher, momsen redovisas av salongen vid
 * inlösen. Gäst (namn + e-post) eller inloggad köpare. Beloppet kommer från
 * servern (formuläret validerat med Zod, öre och avgift räknas i
 * `private.gift_card_open_order`).
 *
 * Kortet skapas först när Stripe säger betalt (`fulfillGiftCardSession`,
 * anropas av webhooken, retursidan och cron-svepet — idempotent).
 */

export const GIFT_CARD_SESSION_TTL_MINUTES = 31;

export type GiftCardCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; code: "unavailable" | "invalid" | "rate_limited" | "failed" };

/** Köpet finns på den här installationen (SE + Stripe-nyckel). */
export function giftCardsEnabled(): boolean {
  return giftCardsMarket() && stripeEnabled();
}

type OpenOrderRow = {
  outcome: "created" | "reused" | "unavailable" | "invalid";
  order_id: string | null;
  amount_minor: number | null;
  fee_minor: number | null;
  currency: string | null;
  stripe_account_id: string | null;
  session_id: string | null;
};

export async function createGiftCardCheckout(input: {
  businessId: string;
  businessName: string;
  slug: string;
  form: GiftCardForm;
  userId: string | null;
  now: Date;
}): Promise<GiftCardCheckoutResult> {
  if (!giftCardsEnabled()) return { ok: false, code: "unavailable" };
  // Kortbedrägeri/spam: per IP + företag och per köpar-e-post (hashade nycklar).
  const ip = await getClientIp();
  const allowed =
    (await hitRateLimit({
      scope: "gift_card:checkout:ip",
      subject: `${input.businessId}:${ip}`,
      windowSeconds: 10 * 60,
      max: 5,
    })) &&
    (await hitRateLimit({
      scope: "gift_card:checkout:email",
      subject: input.form.buyerEmail,
      windowSeconds: 60 * 60,
      max: 5,
    }));
  if (!allowed) return { ok: false, code: "rate_limited" };

  const f = input.form;
  const opened = await withServiceTx(async (q) => {
    const r = await q.query<OpenOrderRow>(
      `select * from private.gift_card_open_order(
         $1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10, $11, $12, $13)`,
      [
        input.businessId,
        input.userId,
        f.buyerName,
        f.buyerEmail,
        f.recipientName,
        f.recipientEmail,
        f.greeting,
        f.theme,
        f.deliverOn,
        f.amountSek * 100,
        MARKETPLACE_FEE_BPS,
        GIFT_CARD_SESSION_TTL_MINUTES,
        input.now,
      ],
    );
    return r.rows[0];
  });
  if (!opened || opened.outcome === "unavailable") {
    return { ok: false, code: "unavailable" };
  }
  if (opened.outcome === "invalid") return { ok: false, code: "invalid" };
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
      return { ok: false, code: "failed" };
    }

    const amount = opened.amount_minor!;
    const fee = opened.fee_minor!;
    const metadata = {
      kind: "gift_card",
      order_id: orderId,
      business_id: input.businessId,
    };
    const base = appBaseUrl();
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        allowed_payment_method_types: ["card"],
        // Kortbedrägeri (presentkort är ett vanligt tvättmål): 3DS alltid.
        payment_method_options: { card: { request_three_d_secure: "any" } },
        locale: "sv",
        client_reference_id: orderId,
        customer_email: f.buyerEmail,
        line_items: [
          {
            quantity: 1,
            // Ingen skattesats: flerfunktionsvoucher (moms vid inlösen).
            price_data: {
              currency: opened.currency!.toLowerCase(),
              unit_amount: amount,
              product_data: {
                name: `Presentkort ${input.businessName}`,
                description:
                  "Flerfunktionsvoucher – moms redovisas vid inlösen. Gäller i 24 månader.",
              },
            },
          },
        ],
        payment_intent_data: {
          ...(fee > 0 ? { application_fee_amount: fee } : {}),
          description:
            "Presentkort (flerfunktionsvoucher) – moms redovisas vid inlösen",
          metadata,
        },
        metadata,
        expires_at:
          Math.floor(input.now.getTime() / 1000) +
          GIFT_CARD_SESSION_TTL_MINUTES * 60,
        success_url: `${base}${regaloHref(input.slug, "listo")}?session={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}${regaloHref(input.slug)}?avbrutet=1`,
      },
      { stripeAccount: accountId, idempotencyKey: `gift_card:${orderId}` },
    );
    createdSession = session.id;
    if (!session.url) throw new Error("gift_card: session utan url");
    await withServiceTx((q) =>
      q.query(
        `update public.gift_card_orders set session_id = $2
          where id = $1 and session_id is null`,
        [orderId, session.id],
      ),
    );
    return { ok: true, url: session.url };
  } catch {
    if (createdSession) {
      const expired = await stripe.checkout.sessions
        .expire(createdSession, {}, { stripeAccount: accountId })
        .then(() => true)
        .catch(() => false);
      if (!expired) return { ok: false, code: "failed" };
    }
    await withServiceTx((q) =>
      q.query(`select private.gift_card_release_order($1, 'failed')`, [
        orderId,
      ]),
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

const ORDER_COLS = `id, business_id, stripe_account_id, session_id, payment_intent_id, status`;

export type GiftCardFulfillOutcome =
  "created" | "already" | "pending" | "ignored";

function token(): string {
  return randomBytes(32).toString("base64url");
}

/** Sessionen hämtas alltid från Stripes API (D-044 p. 7). Kräver
 * `metadata.kind === "gift_card"`, `payment_status === "paid"` och att
 * order, belopp, valuta och session stämmer (annars kastar
 * `private.gift_card_fulfill` → webhooken svarar 500). */
export async function fulfillGiftCardSession(
  sessionId: string,
  accountId: string,
  now: Date,
): Promise<GiftCardFulfillOutcome> {
  const s = await getStripe().checkout.sessions.retrieve(
    sessionId,
    {},
    { stripeAccount: accountId },
  );
  if (s.metadata?.kind !== "gift_card") return "ignored";
  if (s.payment_status !== "paid") return "pending";
  const orderId = s.metadata.order_id ?? "";
  const pi =
    typeof s.payment_intent === "string"
      ? s.payment_intent
      : (s.payment_intent?.id ?? null);
  const outcome = await withServiceTx(async (q) => {
    const own = await q.query<{ ok: boolean }>(
      `select (stripe_account_id = $2) as ok from public.gift_card_orders where id = $1`,
      [orderId, accountId],
    );
    if (!own.rows[0]?.ok) {
      throw new Error("gift_card: ordern hör inte till kontot");
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const r = await savepoint(q, () =>
          q.query<{ gift_card_id: string; created: boolean }>(
            `select * from private.gift_card_fulfill($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              orderId,
              s.id,
              pi,
              s.amount_total,
              s.currency ?? "",
              generateGiftCardCode(randomInt),
              token(),
              token(),
              now,
            ],
          ),
        );
        return r.rows[0]?.created ? "created" : "already";
      } catch (e) {
        if (pgErrorCode(e) !== "23505") throw e; // kodkollision: ny kod
      }
    }
    throw new Error("gift_card: ingen ledig kod");
  });
  if (outcome === "created") void kickOutbox();
  return outcome;
}

/** Webhooken (Connect): finns en presentkortsorder på sessionen? Då hanteras
 * den här och nästa hanterare hoppas över. */
export async function handleGiftCardCheckoutEvent(
  type: "completed" | "expired",
  sessionId: string,
  accountId: string,
  now: Date,
): Promise<boolean> {
  const order = await withServiceTx(async (q) => {
    const r = await q.query<OrderRow>(
      `select ${ORDER_COLS} from public.gift_card_orders where session_id = $1`,
      [sessionId],
    );
    return r.rows[0];
  });
  if (!order) return false;
  if (order.stripe_account_id !== accountId) return true;
  if (type === "completed") {
    await fulfillGiftCardSession(sessionId, accountId, now);
    return true;
  }
  const s = await getStripe().checkout.sessions.retrieve(
    sessionId,
    {},
    { stripeAccount: accountId },
  );
  if (s.status === "expired") {
    await withServiceTx((q) =>
      q.query(`select private.gift_card_release_order($1, 'expired')`, [
        order.id,
      ]),
    );
  } else if (s.status === "complete") {
    await fulfillGiftCardSession(sessionId, accountId, now);
  }
  return true;
}

/** `charge.refunded` / `charge.dispute.created` (Connect). Återbetalningen
 * speglas KUMULATIVT (som D-053): `charge.amount_refunded` från Stripes API. */
export async function handleGiftCardPaymentEvent(
  kind: "refunded" | "disputed" | "dispute_won",
  paymentIntentId: string,
  accountId: string,
  now: Date,
): Promise<boolean> {
  const order = await withServiceTx(async (q) => {
    const r = await q.query<OrderRow>(
      `select ${ORDER_COLS} from public.gift_card_orders
        where payment_intent_id = $1 and stripe_account_id = $2`,
      [paymentIntentId, accountId],
    );
    return r.rows[0];
  });
  if (!order) return false;
  let refundedTotal = 0;
  if (kind === "refunded") {
    const pi = await getStripe().paymentIntents.retrieve(
      paymentIntentId,
      { expand: ["latest_charge"] },
      { stripeAccount: accountId },
    );
    const charge =
      typeof pi.latest_charge === "object" ? pi.latest_charge : null;
    refundedTotal = charge?.amount_refunded ?? 0;
    if (refundedTotal <= 0) return true;
  }
  await withServiceTx((q) =>
    q.query(`select private.gift_card_mark_payment($1, $2, $3, $4)`, [
      paymentIntentId,
      kind,
      refundedTotal,
      now,
    ]),
  );
  return true;
}

/** Retursidan (`/<slug>/presentkort/klart?session=…`): skapa kortet direkt om
 * webhooken inte hunnit. Sessionens id är okänt för andra (Stripe-genererat). */
export async function confirmGiftCardReturn(
  businessId: string,
  sessionId: string,
  now: Date,
): Promise<GiftCardFulfillOutcome> {
  if (!giftCardsEnabled() || !/^cs_[A-Za-z0-9_]{1,250}$/.test(sessionId)) {
    return "ignored";
  }
  const order = await withServiceTx(async (q) => {
    const r = await q.query<{ stripe_account_id: string; status: string }>(
      `select stripe_account_id, status from public.gift_card_orders
        where session_id = $1 and business_id = $2`,
      [sessionId, businessId],
    );
    return r.rows[0];
  });
  if (!order) return "ignored";
  if (order.status === "paid") return "already";
  return fulfillGiftCardSession(sessionId, order.stripe_account_id, now);
}

/** Retursidans sammanfattning (mottagarens förnamn, belopp, leveransdag) —
 * bara för en betald order på det här företaget. */
export async function loadGiftCardReturn(
  businessId: string,
  sessionId: string,
): Promise<
  | {
      amountMinor: number;
      recipientName: string | null;
      deliverOn: string | null;
      theme: string;
      toBuyer: boolean;
    }
  | undefined
> {
  if (!/^cs_[A-Za-z0-9_]{1,250}$/.test(sessionId)) return undefined;
  return withServiceTx(async (q) => {
    const r = await q.query<{
      amount_minor: number;
      recipient_name: string | null;
      recipient_email: string | null;
      deliver_on: string | null;
      theme: string;
      status: string;
    }>(
      `select amount_minor, recipient_name, recipient_email,
              to_char(deliver_on, 'YYYY-MM-DD') as deliver_on, theme, status
         from public.gift_card_orders
        where session_id = $1 and business_id = $2`,
      [sessionId, businessId],
    );
    const x = r.rows[0];
    if (!x || x.status !== "paid") return undefined;
    return {
      amountMinor: x.amount_minor,
      recipientName: x.recipient_name?.split(" ")[0] ?? null,
      deliverOn: x.deliver_on,
      theme: x.theme,
      toBuyer: x.recipient_email === null,
    };
  });
}

const SWEEP_LIMIT = 25;

/**
 * Cron-passet (`/api/cron/outbox`): utgångna kort, bekräftade besök vars tid
 * passerat (reservationen blir betalning), persondata efter 90 dagar, och
 * öppna ordrar som webhooken missat (frågar Stripe, backoff).
 */
export async function runGiftCardSweep(now: Date): Promise<{
  orders: number;
  expired: number;
  settled: number;
  cleared: number;
}> {
  const swept = await withServiceTx(async (q) => {
    const r = await q.query<{
      expired: number;
      settled: number;
      cleared: number;
    }>(`select * from private.gift_card_sweep($1)`, [now]);
    return r.rows[0] ?? { expired: 0, settled: 0, cleared: 0 };
  });
  if (!stripeEnabled()) return { orders: 0, ...swept };
  const stale = await withServiceTx(async (q) => {
    const r = await q.query<OrderRow>(
      `select ${ORDER_COLS} from public.gift_card_orders
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
          q.query(`select private.gift_card_release_order($1, 'failed')`, [
            o.id,
          ]),
        );
      } else {
        const s = await getStripe().checkout.sessions.retrieve(
          o.session_id,
          {},
          { stripeAccount: o.stripe_account_id },
        );
        if (s.status === "complete") {
          await fulfillGiftCardSession(o.session_id, o.stripe_account_id, now);
        } else if (s.status === "expired") {
          await withServiceTx((q) =>
            q.query(`select private.gift_card_release_order($1, 'expired')`, [
              o.id,
            ]),
          );
        } else {
          throw new Error("gift_card: sessionen är fortfarande öppen");
        }
      }
      orders += 1;
    } catch {
      await withServiceTx((q) =>
        q.query(
          `update public.gift_card_orders
              set attempts = attempts + 1,
                  next_attempt_at = $2::timestamptz + interval '1 minute' *
                    (case least(attempts, 3) when 0 then 1 when 1 then 5 when 2 then 15 else 60 end)
            where id = $1`,
          [o.id, now],
        ),
      ).catch(() => undefined);
    }
  }
  return { orders, ...swept };
}

/** Säljer företaget presentkort just nu? (SE, Stripe på, reglaget på, planen
 * har onlinebetalning, kontot kan ta betalt.) */
export async function businessCanSellGiftCards(
  businessId: string,
): Promise<boolean> {
  if (!giftCardsEnabled()) return false;
  return withServiceTx(async (q) => {
    const r = await q.query<{ ok: boolean }>(
      `select (b.gift_cards_enabled
               and private.plan_has_feature(b.plan::text, 'online_payment')
               and coalesce(sa.charges_enabled, false)) as ok
         from public.businesses b
         left join public.stripe_accounts sa on sa.business_id = b.id
        where b.id = $1`,
      [businessId],
    );
    return r.rows[0]?.ok ?? false;
  });
}
