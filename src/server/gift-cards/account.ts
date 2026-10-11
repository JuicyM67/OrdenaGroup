import "server-only";

import { createHash } from "node:crypto";

import { APP_TZ, parseTimeZone, type TimeZone } from "@/lib/format/dates";
import { withServiceTx, withUserTx } from "@/server/db/tx";
import { getStripe, stripeEnabled } from "@/server/payments/stripe/client";

import { canWithdraw, type GiftCardStatus } from "./rules";

/**
 * WP-77 (D-058): presentkorten sett från köparen (kontot eller köparens
 * länk i kvittot) och från mottagaren (länken i leveransmejlet). Länkarna bär
 * en engångsgenererad token; databasen har bara SHA-256 (D-029-mönstret).
 */

function tzOrDefault(raw: string | null | undefined): TimeZone {
  const r = raw ? parseTimeZone(raw) : undefined;
  return r?.ok ? r.value : APP_TZ;
}

export function hashGiftCardToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}

export function isGiftCardTokenShape(t: unknown): t is string {
  return typeof t === "string" && /^[A-Za-z0-9_-]{32,64}$/.test(t);
}

export type MyGiftCard = {
  id: string;
  code: string;
  initialMinor: number;
  balanceMinor: number;
  status: GiftCardStatus;
  purchasedAt: string;
  expiresAt: string;
  deliveredAt: string | null;
  deliverOn: string | null;
  recipientName: string | null;
  theme: string;
  businessName: string;
  businessSlug: string;
  timeZone: TimeZone;
  canWithdraw: boolean;
};

type MyRow = {
  id: string;
  code: string;
  initial_minor: number;
  balance_minor: number;
  status: GiftCardStatus;
  purchased_at: Date;
  expires_at: Date;
  delivered_at: Date | null;
  deliver_on: Date | string | null;
  recipient_name: string | null;
  theme: string;
  business_name: string;
  business_slug: string;
  timezone: string;
};

function dateOnly(d: Date | string | null): string | null {
  if (d === null) return null;
  return typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

export async function loadMyGiftCards(
  userId: string,
  now: Date,
): Promise<MyGiftCard[]> {
  const rows = await withUserTx(userId, async (q) => {
    const r = await q.query<MyRow>(`select * from private.my_gift_cards()`);
    return r.rows;
  });
  return rows.map((x) => {
    const tz = tzOrDefault(x.timezone);
    return {
      id: x.id,
      code: x.code,
      initialMinor: x.initial_minor,
      balanceMinor: x.balance_minor,
      status: x.status,
      purchasedAt: x.purchased_at.toISOString(),
      expiresAt: x.expires_at.toISOString(),
      deliveredAt: x.delivered_at?.toISOString() ?? null,
      deliverOn: dateOnly(x.deliver_on),
      recipientName: x.recipient_name,
      theme: x.theme,
      businessName: x.business_name,
      businessSlug: x.business_slug,
      timeZone: tz,
      canWithdraw:
        stripeEnabled() &&
        x.status === "active" &&
        x.balance_minor === x.initial_minor &&
        canWithdraw(x.purchased_at, now, tz),
    };
  });
}

export type GiftCardView = {
  id: string;
  /** Vem länken tillhör: köparen (kvittot) eller mottagaren (leveransen). */
  holder: "buyer" | "recipient";
  code: string;
  initialMinor: number;
  balanceMinor: number;
  status: GiftCardStatus;
  purchasedAt: Date;
  expiresAt: Date;
  recipientName: string | null;
  buyerName: string | null;
  greeting: string | null;
  theme: string;
  deliverOn: string | null;
  timeZone: TimeZone;
  canWithdraw: boolean;
};

/** Kortet bakom en länk, bara hos företaget i URL:en (`/<slug>/presentkort/kort?t=`). */
export async function loadGiftCardByToken(
  businessId: string,
  token: string,
  now: Date,
): Promise<GiftCardView | undefined> {
  if (!isGiftCardTokenShape(token)) return undefined;
  const hash = hashGiftCardToken(token);
  const x = await withServiceTx(async (q) => {
    const r = await q.query<{
      id: string;
      holder: "buyer" | "recipient";
      code: string;
      initial_minor: number;
      balance_minor: number;
      status: GiftCardStatus;
      purchased_at: Date;
      expires_at: Date;
      recipient_name: string | null;
      buyer_name: string | null;
      greeting: string | null;
      theme: string;
      deliver_on: Date | string | null;
      timezone: string;
    }>(
      `select g.id,
              case when g.view_token_hash = $2 then 'recipient' else 'buyer' end as holder,
              g.code, g.initial_minor, g.balance_minor, g.status, g.purchased_at,
              g.expires_at, o.recipient_name, o.buyer_name, o.greeting, o.theme,
              o.deliver_on, b.timezone
         from public.gift_cards g
         join public.gift_card_orders o on o.business_id = g.business_id and o.id = g.order_id
         join public.businesses b on b.id = g.business_id
        where g.business_id = $1
          and (g.view_token_hash = $2 or o.buyer_token_hash = $2)`,
      [businessId, hash],
    );
    return r.rows[0];
  });
  if (!x) return undefined;
  const tz = tzOrDefault(x.timezone);
  return {
    id: x.id,
    holder: x.holder,
    code: x.code,
    initialMinor: x.initial_minor,
    balanceMinor: x.balance_minor,
    status: x.status,
    purchasedAt: x.purchased_at,
    expiresAt: x.expires_at,
    recipientName: x.recipient_name,
    buyerName: x.buyer_name,
    greeting: x.greeting,
    theme: x.theme,
    deliverOn: dateOnly(x.deliver_on),
    timeZone: tz,
    canWithdraw:
      x.holder === "buyer" &&
      stripeEnabled() &&
      x.status === "active" &&
      x.balance_minor === x.initial_minor &&
      canWithdraw(x.purchased_at, now, tz),
  };
}

export type GiftCardWithdrawResult =
  { ok: true } | { ok: false; code: "not_found" | "not_allowed" | "failed" };

/**
 * "Ångra köp" (ångerrätt 14 dagar, oanvänt): full återbetalning inklusive
 * plattformsavgiften (`refund_application_fee`). Kortet flyttas först
 * `active` → `refunding` under radlås (samma lås som en reservation/inlösen
 * tar, D-057 B1), sedan Stripe, sedan `refunded` (ledger `refund`). Köparen
 * identifieras med kontot eller med köparens länk (gäst).
 */
export async function withdrawGiftCard(
  who:
    { userId: string; cardId: string } | { businessId: string; token: string },
  now: Date,
): Promise<GiftCardWithdrawResult> {
  if (!stripeEnabled()) return { ok: false, code: "not_allowed" };
  const row = await withServiceTx(async (q) => {
    const r =
      "userId" in who
        ? await q.query<WithdrawRow>(
            `${WITHDRAW_SELECT} where g.id = $1 and g.user_id = $2 for update of g`,
            [who.cardId, who.userId],
          )
        : await q.query<WithdrawRow>(
            `${WITHDRAW_SELECT} where g.business_id = $1 and o.buyer_token_hash = $2 for update of g`,
            [
              who.businessId,
              isGiftCardTokenShape(who.token)
                ? hashGiftCardToken(who.token)
                : Buffer.alloc(32),
            ],
          );
    const x = r.rows[0];
    if (!x) return undefined;
    if (
      x.status !== "active" ||
      x.balance_minor !== x.initial_minor ||
      !x.payment_intent_id ||
      !canWithdraw(x.purchased_at, now, tzOrDefault(x.timezone))
    ) {
      return null;
    }
    const u = await q.query(
      `update public.gift_cards set status = 'refunding'
        where id = $1 and status = 'active' and balance_minor = initial_minor`,
      [x.id],
    );
    return (u.rowCount ?? 0) === 1 ? x : null;
  });
  if (row === undefined) return { ok: false, code: "not_found" };
  if (row === null) return { ok: false, code: "not_allowed" };
  try {
    await getStripe().refunds.create(
      {
        payment_intent: row.payment_intent_id!,
        refund_application_fee: true,
        reason: "requested_by_customer",
      },
      {
        stripeAccount: row.stripe_account_id,
        idempotencyKey: `gift-card-refund:${row.id}`,
      },
    );
  } catch {
    await withServiceTx((q) =>
      q.query(
        `update public.gift_cards set status = 'active'
          where id = $1 and status = 'refunding'`,
        [row.id],
      ),
    ).catch(() => undefined);
    return { ok: false, code: "failed" };
  }
  // Leveransmejlet som inte gått ut stoppas; webhooken (`charge.refunded`)
  // gör samma markering om det här steget skulle falla.
  await withServiceTx(async (q) => {
    await q.query(
      `select private.gift_card_mark_payment($1, 'withdrawn', 0, $2)`,
      [row.payment_intent_id, now],
    );
    await q.query(
      `update public.message_outbox set status = 'cancelled', payload = '{}'::jsonb
        where dedupe_key = $1 and status in ('queued', 'failed')`,
      [`gift_delivery:${row.id}`],
    );
  }).catch(() => undefined);
  return { ok: true };
}

type WithdrawRow = {
  id: string;
  status: GiftCardStatus;
  balance_minor: number;
  initial_minor: number;
  purchased_at: Date;
  payment_intent_id: string | null;
  stripe_account_id: string;
  timezone: string;
};

const WITHDRAW_SELECT = `select g.id, g.status, g.balance_minor, g.initial_minor,
        g.purchased_at, o.payment_intent_id, o.stripe_account_id, b.timezone
   from public.gift_cards g
   join public.gift_card_orders o on o.business_id = g.business_id and o.id = g.order_id
   join public.businesses b on b.id = g.business_id`;
