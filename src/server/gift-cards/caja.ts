import "server-only";

import { z } from "zod";

import { localDayRange, toLocalDate, type LocalDate } from "@/lib/format/dates";
import { MONEY_MAX } from "@/lib/format/money";
import { pgErrorCode } from "@/server/db/errors";
import { hasPerm, loadMember } from "@/server/db/permissions";
import { hitRateLimit } from "@/server/db/rate-limit";
import { withOwnerTx, withServiceTx } from "@/server/db/tx";
import { loadBusinessTz } from "@/server/payments/business-tz";
import { loadPlanIn, planCan } from "@/server/plans/entitlements";

import { normalizeGiftCardCode, type GiftCardStatus } from "./rules";

/**
 * WP-87 (D-073, port av SE WP-77/D-058): Caja → Tarjetas de regalo. Sålda
 * kort är en SKULD (saldo till kunderna), inte intäkt; inlösen på en bokning
 * är en betalning (`payments.method = 'gift_card'`). Allt körs med
 * medlemmens JWT: listan via RLS (`can_view_reports`, kolumn-grants utan
 * kod/e-post/namn), uppslag och inlösen via `private.gift_card_*_at_till`
 * (egen behörighetskontroll, 42501 annars, bara företagets egna kort).
 * Misslyckade uppslag rate-limitas per medlem (20/timme) och företag
 * (100/timme).
 */

export type BusinessGiftCard = {
  id: string;
  initialMinor: number;
  balanceMinor: number;
  status: GiftCardStatus;
  purchasedAt: Date;
  expiresAt: Date;
  /** `null` = köpt online (SE-modellen, används inte i CL ännu). */
  method: "cash" | "card_terminal" | "transfer" | null;
  /** Anulera går: sålt i salongen i dag och oanvänt. */
  canVoid: boolean;
};

export type BusinessGiftCardSummary = {
  /** Sålt i dag per metod (utan anulerade). */
  soldToday: { method: string; amountMinor: number }[];
  soldTodayMinor: number;
  /** Sålt i år (kalenderår, företagets tidszon), utan anulerade. */
  soldYearMinor: number;
  /** Kvar att lösa in: saldo på giltiga kort (skuld). */
  outstandingMinor: number;
  redeemedMinor: number;
  expiredMinor: number;
  items: BusinessGiftCard[];
  /** Ägaren/`can_edit_settings` får ändra raden på bokningssidan. */
  showOnPage: boolean;
  canEditSettings: boolean;
  /** Planen har `gift_cards` (sälja). Inlösen kräver ingen plan. */
  canSell: boolean;
};

export async function loadBusinessGiftCards(
  userId: string,
  businessId: string,
  now: Date,
): Promise<BusinessGiftCardSummary> {
  return withOwnerTx(userId, async (q) => {
    const member = await loadMember(q, userId, businessId);
    const tz = await loadBusinessTz(q, businessId);
    const today = toLocalDate(now, tz);
    const yearStart = localDayRange(
      `${today.slice(0, 4)}-01-01` as LocalDate,
      tz,
    ).start;
    const r = await q.query<{
      id: string;
      initial_minor: number;
      balance_minor: number;
      status: GiftCardStatus;
      purchased_at: Date;
      expires_at: Date;
      channel: string;
      in_store_method: "cash" | "card_terminal" | "transfer" | null;
    }>(
      `select g.id, g.initial_minor, g.balance_minor, g.status, g.purchased_at,
              g.expires_at, o.channel, o.in_store_method
         from public.gift_cards g
         join public.gift_card_orders o
           on o.business_id = g.business_id and o.id = g.order_id
        where g.business_id = $1
        order by g.purchased_at desc
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
    const settings = await q.query<{ gift_cards_enabled: boolean }>(
      `select gift_cards_enabled from public.businesses where id = $1`,
      [businessId],
    );
    const plan = await loadPlanIn(q, businessId);
    const by = (k: string) => sums.rows.find((x) => x.kind === k)?.total ?? 0;
    const live = r.rows.filter((x) => x.status !== "refunded");
    const todays = live.filter(
      (x) =>
        x.channel === "in_store" && toLocalDate(x.purchased_at, tz) === today,
    );
    const perMethod = new Map<string, number>();
    for (const x of todays) {
      const m = x.in_store_method ?? "cash";
      perMethod.set(m, (perMethod.get(m) ?? 0) + x.initial_minor);
    }
    return {
      soldToday: [...perMethod].map(([method, amountMinor]) => ({
        method,
        amountMinor,
      })),
      soldTodayMinor: todays.reduce((a, x) => a + x.initial_minor, 0),
      soldYearMinor: live
        .filter((x) => x.purchased_at >= yearStart)
        .reduce((a, x) => a + x.initial_minor, 0),
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
      items: r.rows.map((x) => ({
        id: x.id,
        initialMinor: x.initial_minor,
        balanceMinor: x.balance_minor,
        status: x.status,
        purchasedAt: x.purchased_at,
        expiresAt: x.expires_at,
        method: x.channel === "in_store" ? x.in_store_method : null,
        canVoid:
          x.channel === "in_store" &&
          x.status === "active" &&
          x.balance_minor === x.initial_minor &&
          toLocalDate(x.purchased_at, tz) === today,
      })),
      showOnPage: settings.rows[0]?.gift_cards_enabled ?? false,
      canEditSettings: hasPerm(member, "can_edit_settings"),
      canSell: planCan(plan, "gift_cards"),
    };
  });
}

export type TillBooking = {
  id: string;
  start: Date;
  serviceName: string;
  dueMinor: number;
};

/** Dagens bokningar med något kvar att betala ("Usar en"), plus en vald
 * bokning (`?reserva=` från "Marcar como pagada") även om den är en annan dag. */
export async function loadTillBookings(
  userId: string,
  businessId: string,
  now: Date,
  extraBookingId?: string | null,
): Promise<TillBooking[]> {
  const extra =
    extraBookingId && z.guid().safeParse(extraBookingId).success
      ? extraBookingId
      : null;
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
          and ((lower(bk.period) >= $2 and lower(bk.period) < $3) or bk.id = $4)
        order by lower(bk.period)`,
      [businessId, day.start, day.end, extra],
    );
    return r.rows
      .filter((x) => x.due > 0)
      .map((x) => ({
        id: x.id,
        start: x.start,
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
  expiresAt: Date;
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
        expiresAt: card.expires_at,
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
      // Samma serialisering som "Marcar como pagada" (mark-paid.ts).
      if (parsed.data.bookingId) {
        await q.query(
          "select pg_advisory_xact_lock(hashtextextended('booking-payment:' || $1::text || ':' || $2::text, 0))",
          [businessId, parsed.data.bookingId],
        );
      }
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

export type VoidGiftCardResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "forbidden"
        | "not_found"
        | "not_allowed"
        | "same_day_required"
        | "unexpected";
    };

/** Anulera en försäljning i salongen (samma dag, oanvänt kort). */
export async function voidGiftCard(
  userId: string,
  businessId: string,
  giftCardId: string,
  now: Date,
): Promise<VoidGiftCardResult> {
  if (!z.guid().safeParse(giftCardId).success) {
    return { ok: false, code: "not_found" };
  }
  try {
    const outcome = await withOwnerTx(userId, async (q) => {
      const r = await q.query<{ outcome: string }>(
        `select private.gift_card_void_in_store($1, $2, $3) as outcome`,
        [businessId, giftCardId, now],
      );
      return r.rows[0]?.outcome;
    });
    if (outcome === "voided") return { ok: true };
    if (
      outcome === "not_found" ||
      outcome === "not_allowed" ||
      outcome === "same_day_required"
    ) {
      return { ok: false, code: outcome };
    }
    return { ok: false, code: "unexpected" };
  } catch (e) {
    if (pgErrorCode(e) === "42501") return { ok: false, code: "forbidden" };
    return { ok: false, code: "unexpected" };
  }
}

/** Raden "Regala una tarjeta de regalo" på bokningssidan (ägaren eller
 * `can_edit_settings`). `gift_cards_enabled` har ingen grant till
 * `authenticated` (D-058): servern skriver efter kontrollen. */
export async function setGiftCardsOnPage(
  userId: string,
  businessId: string,
  enabled: boolean,
): Promise<{ ok: boolean }> {
  const allowed = await withOwnerTx(userId, async (q) =>
    hasPerm(await loadMember(q, userId, businessId), "can_edit_settings"),
  );
  if (!allowed) return { ok: false };
  await withServiceTx((q) =>
    q.query(
      `update public.businesses set gift_cards_enabled = $2 where id = $1`,
      [businessId, enabled],
    ),
  );
  return { ok: true };
}

/** Bokningssidan: visa raden när företaget slagit på den och planen har
 * funktionen. */
export async function businessShowsGiftCards(
  businessId: string,
): Promise<boolean> {
  return withServiceTx(async (q) => {
    const r = await q.query<{ gift_cards_enabled: boolean }>(
      `select gift_cards_enabled from public.businesses where id = $1`,
      [businessId],
    );
    if (!r.rows[0]?.gift_cards_enabled) return false;
    return planCan(await loadPlanIn(q, businessId), "gift_cards");
  });
}
