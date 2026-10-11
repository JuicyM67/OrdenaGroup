import "server-only";

import { z } from "zod";

import { localDayRange, toLocalDate } from "@/lib/format/dates";
import { MONEY_MAX } from "@/lib/format/money";
import { pgErrorCode } from "@/server/db/errors";
import { hitRateLimit } from "@/server/db/rate-limit";
import { withOwnerTx } from "@/server/db/tx";
import { loadBusinessTz } from "@/server/payments/business-tz";

import { normalizeGiftCardCode, type GiftCardStatus } from "./rules";

/**
 * WP-77 (D-058): Kassa → Presentkort. Sålda presentkort är en SKULD (inte
 * intäkt); inlösen är en betalning (`payments.method = 'gift_card'`) på
 * bokningen. Allt körs med medlemmens JWT: listan via RLS (`can_view_reports`,
 * kolumn-grants utan kod/e-post), uppslag och inlösen via
 * `private.gift_card_*_at_till` (egen behörighetskontroll, 42501 annars).
 * Misslyckade uppslag rate-limitas per medlem (20 / timme).
 */

export type BusinessGiftCard = {
  id: string;
  initialMinor: number;
  balanceMinor: number;
  status: GiftCardStatus;
  purchasedAt: string;
  expiresAt: string;
};

export type BusinessGiftCardSummary = {
  /** Sålt i år (kalenderår, företagets tidszon), utan återbetalda. */
  soldYearMinor: number;
  soldCount: number;
  /** Kvar att lösa in: saldo på giltiga kort (skuld). */
  outstandingMinor: number;
  redeemedMinor: number;
  expiredMinor: number;
  items: BusinessGiftCard[];
};

export async function loadBusinessGiftCards(
  userId: string,
  businessId: string,
  now: Date,
): Promise<BusinessGiftCardSummary> {
  return withOwnerTx(userId, async (q) => {
    const tz = await loadBusinessTz(q, businessId);
    const yearStart = localDayRange(
      `${toLocalDate(now, tz).slice(0, 4)}-01-01` as Parameters<
        typeof localDayRange
      >[0],
      tz,
    ).start;
    const r = await q.query<{
      id: string;
      initial_minor: number;
      balance_minor: number;
      status: GiftCardStatus;
      purchased_at: Date;
      expires_at: Date;
    }>(
      `select id, initial_minor, balance_minor, status, purchased_at, expires_at
         from public.gift_cards
        where business_id = $1
        order by purchased_at desc
        limit 200`,
      [businessId],
    );
    const sums = await q.query<{ kind: string; total: number }>(
      `select kind, coalesce(-sum(delta_minor), 0)::int as total
         from public.gift_card_ledger
        where business_id = $1 and kind in ('redeem', 'hold', 'release', 'expire')
        group by kind`,
      [businessId],
    );
    const by = (k: string) => sums.rows.find((x) => x.kind === k)?.total ?? 0;
    const items = r.rows.map((x) => ({
      id: x.id,
      initialMinor: x.initial_minor,
      balanceMinor: x.balance_minor,
      status: x.status,
      purchasedAt: x.purchased_at.toISOString(),
      expiresAt: x.expires_at.toISOString(),
    }));
    const sold = r.rows.filter(
      (x) => x.status !== "refunded" && x.purchased_at >= yearStart,
    );
    return {
      soldYearMinor: sold.reduce((a, x) => a + x.initial_minor, 0),
      soldCount: sold.length,
      outstandingMinor: r.rows
        .filter(
          (x) =>
            (x.status === "active" || x.status === "disputed") &&
            x.expires_at > now,
        )
        .reduce((a, x) => a + x.balance_minor, 0),
      // Reservationer räknas som använda (släppta dras av).
      redeemedMinor: by("redeem") + by("hold") + by("release"),
      expiredMinor: by("expire"),
      items,
    };
  });
}

export type TillBooking = {
  id: string;
  start: string;
  serviceName: string;
  dueMinor: number;
};

/** Dagens bokningar med något kvar att betala ("Använd till"). */
export async function loadTillBookings(
  userId: string,
  businessId: string,
  now: Date,
): Promise<TillBooking[]> {
  return withOwnerTx(userId, async (q) => {
    const tz = await loadBusinessTz(q, businessId);
    const day = localDayRange(toLocalDate(now, tz), tz);
    const r = await q.query<{
      id: string;
      start: Date;
      service_name: string;
      due: number;
    }>(
      `select bk.id, lower(bk.period) as start, s.name as service_name,
              (bk.price_clp - bk.discount_clp - coalesce((
                 select sum(p.amount_clp) from public.payments p
                  where p.business_id = bk.business_id and p.booking_id = bk.id
                    and p.status = 'approved'), 0))::int as due
         from public.bookings bk
         join public.services s on s.business_id = bk.business_id and s.id = bk.service_id
        where bk.business_id = $1
          and bk.status in ('confirmed', 'completed', 'no_show')
          and lower(bk.period) >= $2 and lower(bk.period) < $3
        order by lower(bk.period)`,
      [businessId, day.start, day.end],
    );
    return r.rows
      .filter((x) => x.due > 0)
      .map((x) => ({
        id: x.id,
        start: x.start.toISOString(),
        serviceName: x.service_name,
        dueMinor: x.due,
      }));
  });
}

export type TillLookup = {
  id: string;
  last4: string;
  initialMinor: number;
  balanceMinor: number;
  status: GiftCardStatus;
  expiresAt: string;
  recipientFirstName: string | null;
  theme: string;
};

export type TillLookupResult =
  | { ok: true; card: TillLookup }
  | { ok: false; code: "invalid" | "rate_limited" | "forbidden" };

async function failedLookupAllowed(
  userId: string,
  businessId: string,
): Promise<boolean> {
  const perMember = await hitRateLimit({
    scope: "gift_card:till:member",
    subject: userId,
    windowSeconds: 60 * 60,
    max: 20,
  });
  const perBusiness = await hitRateLimit({
    scope: "gift_card:lookup:business",
    subject: businessId,
    windowSeconds: 60 * 60,
    max: 100,
  });
  if (!perBusiness) {
    // Larm utan persondata (bara att gränsen nåtts).
    console.warn("gift_card: många misslyckade uppslag", { code: "rate" });
  }
  return perMember && perBusiness;
}

export async function lookupGiftCardAtTill(
  userId: string,
  businessId: string,
  rawCode: string,
  now: Date,
): Promise<TillLookupResult> {
  const code = normalizeGiftCardCode(rawCode);
  try {
    const card = code
      ? await withOwnerTx(userId, async (q) => {
          const r = await q.query<{
            gift_card_id: string;
            code_last4: string;
            initial_minor: number;
            balance_minor: number;
            status: GiftCardStatus;
            expires_at: Date;
            recipient_first_name: string | null;
            theme: string;
          }>(`select * from private.gift_card_lookup_at_till($1, $2, $3)`, [
            businessId,
            code,
            now,
          ]);
          return r.rows[0];
        })
      : undefined;
    if (!card) {
      return (await failedLookupAllowed(userId, businessId))
        ? { ok: false, code: "invalid" }
        : { ok: false, code: "rate_limited" };
    }
    return {
      ok: true,
      card: {
        id: card.gift_card_id,
        last4: card.code_last4,
        initialMinor: card.initial_minor,
        balanceMinor: card.balance_minor,
        status: card.status,
        expiresAt: card.expires_at.toISOString(),
        recipientFirstName: card.recipient_first_name || null,
        theme: card.theme,
      },
    };
  } catch (e) {
    if (pgErrorCode(e) === "42501") return { ok: false, code: "forbidden" };
    throw e;
  }
}

const redeemSchema = z.object({
  code: z.string().min(1).max(40),
  amountMinor: z.number().int().positive().max(MONEY_MAX),
  bookingId: z.guid().nullable(),
});

export type TillRedeemResult =
  | {
      ok: true;
      redeemedMinor: number;
      balanceMinor: number;
      withBooking: boolean;
    }
  | {
      ok: false;
      code:
        | "invalid"
        | "expired"
        | "frozen"
        | "empty"
        | "invalid_amount"
        | "invalid_booking"
        | "forbidden"
        | "rate_limited";
    };

export async function redeemGiftCardAtTill(
  userId: string,
  businessId: string,
  input: { code: string; amountMinor: number; bookingId: string | null },
  now: Date,
): Promise<TillRedeemResult> {
  const parsed = redeemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_amount" };
  const code = normalizeGiftCardCode(parsed.data.code);
  if (!code) return { ok: false, code: "invalid" };
  try {
    const r = await withOwnerTx(userId, async (q) => {
      const x = await q.query<{
        outcome: string;
        redeemed_minor: number;
        balance_minor: number;
      }>(
        `select outcome, redeemed_minor, balance_minor
           from private.gift_card_redeem_at_till($1, $2, $3, $4, $5)`,
        [businessId, code, parsed.data.amountMinor, parsed.data.bookingId, now],
      );
      return x.rows[0];
    });
    if (!r) return { ok: false, code: "invalid" };
    if (r.outcome === "redeemed") {
      return {
        ok: true,
        redeemedMinor: r.redeemed_minor,
        balanceMinor: r.balance_minor,
        withBooking: parsed.data.bookingId !== null,
      };
    }
    if (
      r.outcome === "invalid" &&
      !(await failedLookupAllowed(userId, businessId))
    ) {
      return { ok: false, code: "rate_limited" };
    }
    return {
      ok: false,
      code: r.outcome as Exclude<TillRedeemResult, { ok: true }>["code"],
    };
  } catch (e) {
    if (pgErrorCode(e) === "42501") return { ok: false, code: "forbidden" };
    throw e;
  }
}
