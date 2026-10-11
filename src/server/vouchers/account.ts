import "server-only";

import { APP_TZ, parseTimeZone, type TimeZone } from "@/lib/format/dates";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx, withServiceTx, withUserTx } from "@/server/db/tx";
import { getStripe, stripeEnabled } from "@/server/payments/stripe/client";

import { canWithdraw, type VoucherStatus } from "./rules";

/**
 * WP-69 (D-057): värdebevisen sett från köparen (kundkontot) och från
 * företaget (kassan). Köparen läser via `private.my_vouchers()` i sin egen
 * session (RLS + `auth.uid()`), företaget via tabellen med sin JWT (RLS:
 * `can_view_reports`, kolumn-grants utan `code`/`user_id`).
 */

export type MyVoucher = {
  id: string;
  code: string;
  title: string;
  priceMinor: number;
  status: VoucherStatus;
  purchasedAt: string;
  expiresAt: string;
  businessName: string;
  businessSlug: string;
  offerSlug: string;
  imageUrl: string | null;
  bookingStart: string | null;
  /** Inom 14 dagar och oanvänt: "Ångra köp" visas. */
  canWithdraw: boolean;
};

type MyVoucherRow = {
  id: string;
  code: string;
  title: string;
  price_minor: number;
  status: VoucherStatus;
  purchased_at: Date;
  expires_at: Date;
  business_name: string;
  business_slug: string;
  offer_slug: string;
  image_url: string | null;
  booking_start: Date | null;
};

function tzOrDefault(raw: string | null | undefined): TimeZone {
  const r = parseTimeZone(raw ?? "Europe/Stockholm");
  return r.ok ? r.value : ("Europe/Stockholm" as TimeZone);
}

export async function loadMyVouchers(
  userId: string,
  now: Date,
): Promise<MyVoucher[]> {
  const rows = await withUserTx(userId, async (q) => {
    const r = await q.query<MyVoucherRow>(
      `select * from private.my_vouchers()`,
    );
    return r.rows;
  });
  const tz = APP_TZ;
  return rows.map((x) => ({
    id: x.id,
    code: x.code,
    title: x.title,
    priceMinor: x.price_minor,
    status: x.status,
    purchasedAt: x.purchased_at.toISOString(),
    expiresAt: x.expires_at.toISOString(),
    businessName: x.business_name,
    businessSlug: x.business_slug,
    offerSlug: x.offer_slug,
    imageUrl: x.image_url,
    bookingStart: x.booking_start?.toISOString() ?? null,
    canWithdraw:
      stripeEnabled() &&
      x.status === "active" &&
      canWithdraw(x.purchased_at, now, tz),
  }));
}

export type BookableVoucher = {
  id: string;
  code: string;
  title: string;
  serviceId: string;
  expiresAt: Date;
};

/**
 * Värdebeviset som `/[slug]?vardebevis=<id>` bokar med: köparens eget, aktivt,
 * inte utgånget och hos just det här företaget. `undefined` = sidan som vanligt.
 * Valideras igen i bokningens transaktion (`createIn`, radlås).
 */
export async function loadBookableVoucherIn(
  q: Queryable,
  input: { userId: string; voucherId: string; businessId: string; now: Date },
): Promise<BookableVoucher | undefined> {
  const r = await q.query<{
    id: string;
    code: string;
    title: string;
    service_id: string;
    expires_at: Date;
  }>(
    `select v.id, v.code, v.title, v.service_id, v.expires_at
       from public.vouchers v
       join public.services s on s.business_id = v.business_id and s.id = v.service_id
      where v.id = $1 and v.user_id = $2 and v.business_id = $3
        and v.status = 'active' and v.expires_at > $4 and s.active`,
    [input.voucherId, input.userId, input.businessId, input.now],
  );
  const x = r.rows[0];
  return x
    ? {
        id: x.id,
        code: x.code,
        title: x.title,
        serviceId: x.service_id,
        expiresAt: x.expires_at,
      }
    : undefined;
}

export type WithdrawResult =
  { ok: true } | { ok: false; code: "not_found" | "not_allowed" | "failed" };

/**
 * "Ångra köp" (ångerrätt 14 dagar): full återbetalning inklusive
 * plattformsavgiften (`refund_application_fee`) på företagets konto. Bara
 * köparens eget, oanvända värdebevis. Webhooken (`charge.refunded`) speglar
 * samma sak — båda vägarna är idempotenta.
 */
export async function withdrawVoucher(
  userId: string,
  voucherId: string,
  now: Date,
): Promise<WithdrawResult> {
  if (!stripeEnabled()) return { ok: false, code: "not_allowed" };
  const row = await withServiceTx(async (q) => {
    const r = await q.query<{
      status: VoucherStatus;
      purchased_at: Date;
      payment_intent_id: string | null;
      stripe_account_id: string;
      timezone: string;
    }>(
      `select v.status, v.purchased_at, o.payment_intent_id, o.stripe_account_id,
              b.timezone
         from public.vouchers v
         join public.voucher_orders o on o.business_id = v.business_id and o.id = v.order_id
         join public.businesses b on b.id = v.business_id
        where v.id = $1 and v.user_id = $2`,
      [voucherId, userId],
    );
    return r.rows[0];
  });
  if (!row) return { ok: false, code: "not_found" };
  if (
    row.status !== "active" ||
    !row.payment_intent_id ||
    !canWithdraw(row.purchased_at, now, tzOrDefault(row.timezone))
  ) {
    return { ok: false, code: "not_allowed" };
  }
  try {
    await getStripe().refunds.create(
      {
        payment_intent: row.payment_intent_id,
        refund_application_fee: true,
        reason: "requested_by_customer",
      },
      {
        stripeAccount: row.stripe_account_id,
        idempotencyKey: `voucher-refund:${voucherId}`,
      },
    );
    await withServiceTx((q) =>
      q.query(`select private.voucher_mark_payment($1, 'refunded', $2)`, [
        row.payment_intent_id,
        now,
      ]),
    );
    return { ok: true };
  } catch {
    return { ok: false, code: "failed" };
  }
}

export type BusinessVoucher = {
  id: string;
  title: string;
  priceMinor: number;
  status: VoucherStatus;
  purchasedAt: string;
  expiresAt: string;
  bookingStart: string | null;
  redeemedAt: string | null;
};

export type BusinessVoucherSummary = {
  sold: number;
  soldMinor: number;
  redeemed: number;
  open: number;
  items: BusinessVoucher[];
};

/** Kassan → Värdebevis: företagets sålda värdebevis (utan kod och köpare). */
export async function loadBusinessVouchers(
  userId: string,
  businessId: string,
): Promise<BusinessVoucherSummary> {
  return withOwnerTx(userId, async (q) => {
    const r = await q.query<{
      id: string;
      title: string;
      price_minor: number;
      status: VoucherStatus;
      purchased_at: Date;
      expires_at: Date;
      redeemed_at: Date | null;
      booking_start: Date | null;
    }>(
      `select v.id, v.title, v.price_minor, v.status, v.purchased_at,
              v.expires_at, v.redeemed_at, lower(bk.period) as booking_start
         from public.vouchers v
         left join public.bookings bk
           on bk.business_id = v.business_id and bk.id = v.booking_id
        where v.business_id = $1
        order by v.purchased_at desc
        limit 200`,
      [businessId],
    );
    const items = r.rows.map((x) => ({
      id: x.id,
      title: x.title,
      priceMinor: x.price_minor,
      status: x.status,
      purchasedAt: x.purchased_at.toISOString(),
      expiresAt: x.expires_at.toISOString(),
      bookingStart: x.booking_start?.toISOString() ?? null,
      redeemedAt: x.redeemed_at?.toISOString() ?? null,
    }));
    const paid = items.filter((x) => x.status !== "refunded");
    return {
      sold: paid.length,
      soldMinor: paid.reduce((a, x) => a + x.priceMinor, 0),
      redeemed: items.filter((x) => x.status === "redeemed").length,
      open: items.filter(
        (x) => x.status === "active" || x.status === "reserved",
      ).length,
      items,
    };
  });
}
