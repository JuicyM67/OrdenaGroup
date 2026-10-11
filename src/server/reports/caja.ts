import "server-only";

import {
  addLocalDays,
  eachLocalDate,
  isoWeekdayOf,
  localDayRange,
  parseLocalDate,
  parseLocalTime,
  startOfLocalWeek,
  toLocalDate,
  type IsoWeekday,
  type LocalDate,
  type LocalTime,
  type TimeZone,
} from "@/lib/format/dates";
import { pgErrorCode } from "@/server/db/errors";
import { hasPerm, loadMember } from "@/server/db/permissions";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx } from "@/server/db/tx";
import { loadBusinessTz } from "@/server/payments/business-tz";
import {
  intersect,
  normalize,
  subtract,
  type Interval,
} from "@/server/scheduling/core/intervals";
import { hoursToIntervals } from "@/server/scheduling/core/windows";
import type { HoursRow } from "@/server/scheduling/types";

/**
 * WP-24 (F10) · Caja e informes. Alla summor räknas i SQL (rapport-
 * funktionerna från 20260930200300 eller egna aggregat här), aldrig i
 * klienten. Pengar är heltal i minsta enheten. Dagar, veckor (måndag–
 * söndag) och månader räknas i företagets tidszon; `now` injiceras.
 * Kräver `can_view_reports` (ägaren har alltid allt), annars
 * `{ forbidden: true }`.
 */

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type CajaPeriod =
  | { kind: "today" | "week" | "month" }
  | { kind: "range"; from: string; to: string };

export type CajaSummary = {
  /** Summan av godkända betalningar med paid_at i perioden. */
  revenueMinor: number;
  /** Bekräftade/avslutade bokningar i perioden utan full betalning. */
  expectedMinor: number;
  /** Bokningar i perioden, utom avbokade. */
  bookings: number;
  noShows: number;
  /** Snittpris (pris − rabatt) för bekräftade/avslutade; 0 om inga. */
  averageMinor: number;
};

export type BreakdownRow = {
  /** method: betalmetoden (`cash`, `card_terminal`, …); staff/service: id. */
  key: string;
  /** method: samma som `key` (UI:t översätter); staff/service: namnet. */
  label: string;
  amountMinor: number;
  bookings: number;
};

export type PorCobrarRow = {
  bookingId: string;
  /** ISO 8601 (UTC). */
  start: string;
  /** `null` om kunden är anonymiserad. */
  customerName: string | null;
  serviceName: string;
  staffName: string;
  /** Det som återstår: pris − rabatt − godkänd förskottsbetalning. */
  priceMinor: number;
};

export type PagoHoyRow = {
  paymentId: string;
  bookingId: string;
  /** ISO 8601 (UTC). */
  paidAt: string;
  method: string;
  amountMinor: number;
  customerName: string | null;
};

export type CajaData = {
  /** Periodens lokala datum, båda inklusive. */
  period: { from: LocalDate; to: LocalDate };
  summary: CajaSummary;
  byMethod: BreakdownRow[];
  byStaff: BreakdownRow[];
  byService: BreakdownRow[];
  porCobrar: PorCobrarRow[];
  pagosHoy: PagoHoyRow[];
};

export type CajaResult = CajaData | { forbidden: true } | { invalid: true };

export type InformesData = {
  weekly: { weekStart: LocalDate; revenueMinor: number }[];
  occupancyByStaff: {
    staffId: string;
    name: string;
    bookedMinutes: number;
    availableMinutes: number;
  }[];
  newVsReturning: {
    weekStart: LocalDate;
    nuevos: number;
    recurrentes: number;
  }[];
  noShowTrend: { weekStart: LocalDate; pct: number }[];
};

export type InformesResult = InformesData | { forbidden: true };

// ---------------------------------------------------------------------------
// Rena hjälpare
// ---------------------------------------------------------------------------

/** Längsta valfria intervall (dagar, inklusive båda ändar). */
export const MAX_RANGE_DAYS = 366;
const WEEKS = 12;
const OCCUPANCY_DAYS = 28;
const LIST_LIMIT = 200;

/**
 * Periodens lokala datum [from, to] (båda inklusive) i `tz`. `null` för ett
 * ogiltigt intervall (fel format, from > to eller längre än MAX_RANGE_DAYS).
 */
export function resolvePeriod(
  period: CajaPeriod,
  now: Date,
  tz: TimeZone,
): { from: LocalDate; to: LocalDate } | null {
  const today = toLocalDate(now, tz);
  switch (period.kind) {
    case "today":
      return { from: today, to: today };
    case "week": {
      const from = startOfLocalWeek(today);
      return { from, to: addLocalDays(from, 6) };
    }
    case "month": {
      const from = `${today.slice(0, 7)}-01` as LocalDate;
      const next = addLocalDays(from, 31);
      const nextFirst = `${next.slice(0, 7)}-01` as LocalDate;
      return { from, to: addLocalDays(nextFirst, -1) };
    }
    case "range": {
      const from = parseLocalDate(period.from);
      const to = parseLocalDate(period.to);
      if (!from.ok || !to.ok || from.value > to.value) return null;
      if (addLocalDays(from.value, MAX_RANGE_DAYS - 1) < to.value) return null;
      return { from: from.value, to: to.value };
    }
  }
}

/** [start, end) i UTC för lokala datum [from, to]. */
function instantRange(
  from: LocalDate,
  to: LocalDate,
  tz: TimeZone,
): { start: Date; end: Date } {
  return {
    start: localDayRange(from, tz).start,
    end: localDayRange(to, tz).end,
  };
}

/** De senaste `n` veckornas måndagar, äldst först (innevarande vecka sist). */
export function weekStarts(now: Date, tz: TimeZone, n: number): LocalDate[] {
  const current = startOfLocalWeek(toLocalDate(now, tz));
  return Array.from({ length: n }, (_, i) =>
    addLocalDays(current, (i - (n - 1)) * 7),
  );
}

/** Postgres bigint/numeric kommer som sträng från pg. */
function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function totalMinutes(intervals: readonly Interval[]): number {
  return Math.round(
    normalize(intervals).reduce((acc, x) => acc + (x.end - x.start), 0) /
      60_000,
  );
}

// ---------------------------------------------------------------------------
// Caja
// ---------------------------------------------------------------------------

type SummaryRow = {
  revenue_clp: string | null;
  expected_clp: string | null;
  bookings_count: string | null;
  no_show_count: string | null;
  average_price_clp: string | null;
};

type BreakdownDbRow = {
  key: string;
  label: string;
  amount_clp: string;
  bookings_count: string;
};

async function breakdown(
  q: Queryable,
  businessId: string,
  start: string,
  end: string,
  dim: "method" | "staff" | "service",
): Promise<BreakdownRow[]> {
  const r = await q.query<BreakdownDbRow>(
    `select key, label, amount_clp::text as amount_clp,
            bookings_count::text as bookings_count
       from public.report_breakdown($1, $2::timestamptz, $3::timestamptz, $4)`,
    [businessId, start, end, dim],
  );
  return r.rows.map((x) => ({
    key: x.key,
    label: x.label,
    amountMinor: num(x.amount_clp),
    bookings: num(x.bookings_count),
  }));
}

async function loadCajaIn(
  q: Queryable,
  businessId: string,
  now: Date,
  tz: TimeZone,
  days: { from: LocalDate; to: LocalDate },
): Promise<CajaData> {
  const { start, end } = instantRange(days.from, days.to, tz);
  const s = start.toISOString();
  const e = end.toISOString();

  const sum = await q.query<SummaryRow>(
    `select revenue_clp::text as revenue_clp, expected_clp::text as expected_clp,
            bookings_count::text as bookings_count,
            no_show_count::text as no_show_count,
            average_price_clp::text as average_price_clp
       from public.report_summary($1, $2::timestamptz, $3::timestamptz)`,
    [businessId, s, e],
  );
  const sr = sum.rows[0];

  const byMethod = await breakdown(q, businessId, s, e, "method");
  const byStaff = await breakdown(q, businessId, s, e, "staff");
  const byService = await breakdown(q, businessId, s, e, "service");

  // "Att ta betalt för": avslutade, eller bekräftade vars tid har passerat,
  // utan full betalning. Avbokade och uteblivna räknas aldrig.
  const pc = await q.query<{
    id: string;
    start_at: Date;
    customer_name: string | null;
    service_name: string;
    staff_name: string;
    due: number;
  }>(
    `select bk.id, lower(bk.period) as start_at, c.name as customer_name,
            sv.name as service_name, st.name as staff_name,
            (bk.price_clp - bk.discount_clp - coalesce((
               select sum(p.amount_clp) from public.payments p
                where p.business_id = bk.business_id and p.booking_id = bk.id
                  and p.status = 'approved' and p.kind = 'deposit'
             ), 0))::int as due
       from public.bookings bk
       join public.customers c on c.business_id = bk.business_id and c.id = bk.customer_id
       join public.services sv on sv.business_id = bk.business_id and sv.id = bk.service_id
       join public.staff st on st.business_id = bk.business_id and st.id = bk.staff_id
      where bk.business_id = $1
        and lower(bk.period) >= $2::timestamptz and lower(bk.period) < $3::timestamptz
        and (bk.status = 'completed'
             or (bk.status = 'confirmed' and upper(bk.period) <= $4::timestamptz))
        and not exists (
          select 1 from public.payments p
           where p.business_id = bk.business_id and p.booking_id = bk.id
             and p.status = 'approved' and p.kind in ('full', 'balance')
        )
        -- WP-69 (D-057): betald med värdebevis vid köpet — inget att ta betalt för.
        and not exists (
          select 1 from public.vouchers v
           where v.business_id = bk.business_id and v.booking_id = bk.id
             and v.status in ('reserved', 'redeemed')
        )
      order by lower(bk.period)
      limit ${LIST_LIMIT}`,
    [businessId, s, e, now.toISOString()],
  );

  // Dagens betalningar (alltid i dag, oavsett vald period): ångra-listan.
  const today = localDayRange(toLocalDate(now, tz), tz);
  const ph = await q.query<{
    id: string;
    booking_id: string;
    paid_at: Date;
    method: string;
    amount_clp: number;
    customer_name: string | null;
  }>(
    `select p.id, p.booking_id, p.paid_at, p.method::text as method,
            p.amount_clp, c.name as customer_name
       from public.payments p
       join public.bookings bk on bk.business_id = p.business_id and bk.id = p.booking_id
       join public.customers c on c.business_id = bk.business_id and c.id = bk.customer_id
      where p.business_id = $1 and p.status = 'approved'
        and p.paid_at >= $2::timestamptz and p.paid_at < $3::timestamptz
      order by p.paid_at desc
      limit ${LIST_LIMIT}`,
    [businessId, today.start.toISOString(), today.end.toISOString()],
  );

  return {
    period: days,
    summary: {
      revenueMinor: num(sr?.revenue_clp),
      expectedMinor: num(sr?.expected_clp),
      bookings: num(sr?.bookings_count),
      noShows: num(sr?.no_show_count),
      averageMinor: num(sr?.average_price_clp),
    },
    byMethod,
    byStaff,
    byService,
    porCobrar: pc.rows.map((x) => ({
      bookingId: x.id,
      start: x.start_at.toISOString(),
      customerName: x.customer_name,
      serviceName: x.service_name,
      staffName: x.staff_name,
      priceMinor: x.due,
    })),
    pagosHoy: ph.rows.map((x) => ({
      paymentId: x.id,
      bookingId: x.booking_id,
      paidAt: x.paid_at.toISOString(),
      method: x.method,
      amountMinor: x.amount_clp,
      customerName: x.customer_name,
    })),
  };
}

export async function loadCaja(
  userId: string,
  businessId: string,
  now: Date,
  period: CajaPeriod,
): Promise<CajaResult> {
  try {
    return await withOwnerTx(userId, async (q): Promise<CajaResult> => {
      const member = await loadMember(q, userId, businessId);
      if (!hasPerm(member, "can_view_reports")) return { forbidden: true };
      const tz = await loadBusinessTz(q, businessId);
      const days = resolvePeriod(period, now, tz);
      if (!days) return { invalid: true };
      return loadCajaIn(q, businessId, now, tz, days);
    });
  } catch (e) {
    if (pgErrorCode(e) === "42501") return { forbidden: true };
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Informes
// ---------------------------------------------------------------------------

type HoursDbRow = {
  staff_id?: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

function toHours(r: HoursDbRow): HoursRow | null {
  const start = parseLocalTime(r.start_time);
  const end = parseLocalTime(r.end_time, { allowEndOfDay: true });
  if (!start.ok || !end.ok) return null;
  return {
    weekday: r.weekday as IsoWeekday,
    start: start.value as LocalTime,
    end: end.value as LocalTime,
  };
}

/** Beläggning senaste 28 dagarna (till och med i dag). */
async function occupancy(
  q: Queryable,
  businessId: string,
  now: Date,
  tz: TimeZone,
): Promise<InformesData["occupancyByStaff"]> {
  const today = toLocalDate(now, tz);
  const from = addLocalDays(today, -(OCCUPANCY_DAYS - 1));
  const { start, end } = instantRange(from, today, tz);
  const s = start.toISOString();
  const e = end.toISOString();

  const staff = await q.query<{ id: string; name: string }>(
    `select id, name from public.staff
      where business_id = $1 and active
      order by sort, name`,
    [businessId],
  );
  const bh = await q.query<HoursDbRow>(
    `select weekday, start_time::text as start_time, end_time::text as end_time
       from public.business_hours where business_id = $1`,
    [businessId],
  );
  const sh = await q.query<HoursDbRow>(
    `select staff_id, weekday, start_time::text as start_time,
            end_time::text as end_time
       from public.staff_hours where business_id = $1`,
    [businessId],
  );
  const off = await q.query<{ staff_id: string | null; s: number; e: number }>(
    `select staff_id,
            extract(epoch from lower(period))::float8 * 1000 as s,
            extract(epoch from upper(period))::float8 * 1000 as e
       from public.time_off
      where business_id = $1
        and period && tstzrange($2::timestamptz, $3::timestamptz, '[)')`,
    [businessId, s, e],
  );
  // Bokad tid = tjänstens tid (utan buffert), klippt till intervallet.
  const booked = await q.query<{ staff_id: string; minutes: string }>(
    `select bk.staff_id,
            round(sum(extract(epoch from (
              upper(bk.period * tstzrange($2::timestamptz, $3::timestamptz, '[)'))
              - lower(bk.period * tstzrange($2::timestamptz, $3::timestamptz, '[)'))
            ))) / 60)::text as minutes
       from public.bookings bk
      where bk.business_id = $1
        and bk.period && tstzrange($2::timestamptz, $3::timestamptz, '[)')
        and bk.status in ('pending_payment', 'confirmed', 'completed', 'no_show')
      group by bk.staff_id`,
    [businessId, s, e],
  );

  const businessHours = bh.rows
    .map(toHours)
    .filter((x): x is HoursRow => x !== null);
  const staffHours = new Map<string, HoursRow[]>();
  for (const r of sh.rows) {
    const h = toHours(r);
    if (!h || !r.staff_id) continue;
    const list = staffHours.get(r.staff_id) ?? [];
    list.push(h);
    staffHours.set(r.staff_id, list);
  }
  const bookedBy = new Map(
    booked.rows.map((r) => [r.staff_id, num(r.minutes)]),
  );
  const dates = eachLocalDate(from, today);

  return staff.rows.map((st) => {
    // Samma regel som schemamotorn: personalens tider snävar in företagets.
    const own = staffHours.get(st.id) ?? null;
    const working: Interval[] = [];
    for (const d of dates) {
      if (!businessHours.some((h) => h.weekday === isoWeekdayOf(d))) continue;
      const biz = hoursToIntervals(businessHours, d, tz);
      working.push(
        ...(own ? intersect(biz, hoursToIntervals(own, d, tz)) : biz),
      );
    }
    const cuts = off.rows
      .filter((t) => t.staff_id === null || t.staff_id === st.id)
      .map((t) => ({ start: Math.round(t.s), end: Math.round(t.e) }));
    return {
      staffId: st.id,
      name: st.name,
      bookedMinutes: bookedBy.get(st.id) ?? 0,
      availableMinutes: totalMinutes(subtract(working, cuts)),
    };
  });
}

async function loadInformesIn(
  q: Queryable,
  businessId: string,
  now: Date,
  tz: TimeZone,
): Promise<InformesData> {
  const weeks = weekStarts(now, tz, WEEKS);
  const first = weeks[0]!;
  const last = weeks[weeks.length - 1]!;
  const { start, end } = instantRange(first, addLocalDays(last, 6), tz);
  const s = start.toISOString();
  const e = end.toISOString();

  const rev = await q.query<{ week_start: string; revenue_clp: string }>(
    `select week_start::text as week_start, revenue_clp::text as revenue_clp
       from public.report_weekly($1, $2)`,
    [businessId, WEEKS],
  );
  const revBy = new Map(
    rev.rows.map((r) => [r.week_start, num(r.revenue_clp)]),
  );

  // Ny = kundens första bokning någonsin ligger i veckan; annars återkommande.
  const nvr = await q.query<{
    wk: string;
    nuevos: string;
    recurrentes: string;
  }>(
    `with appts as (
       select bk.customer_id, lower(bk.period) as s
         from public.bookings bk
        where bk.business_id = $1
          and bk.status in ('pending_payment', 'confirmed', 'completed')
     ),
     firsts as (
       select customer_id, min(s) as first_s from appts group by customer_id
     ),
     x as (
       select a.customer_id,
              to_char(date_trunc('week', a.s at time zone $4::text), 'YYYY-MM-DD') as wk,
              to_char(date_trunc('week', f.first_s at time zone $4::text), 'YYYY-MM-DD') as first_wk
         from appts a join firsts f on f.customer_id = a.customer_id
        where a.s >= $2::timestamptz and a.s < $3::timestamptz
     )
     select wk,
            (count(distinct customer_id) filter (where first_wk = wk))::text as nuevos,
            (count(distinct customer_id) filter (where first_wk < wk))::text as recurrentes
       from x group by wk`,
    [businessId, s, e, tz],
  );
  const nvrBy = new Map(nvr.rows.map((r) => [r.wk, r]));

  // Uteblivna / (alla bokningar som inte avbokats eller bara är förfrågningar),
  // bara bokningar vars tid har börjat.
  const ns = await q.query<{ wk: string; pct: number }>(
    `select to_char(date_trunc('week', lower(bk.period) at time zone $4::text), 'YYYY-MM-DD') as wk,
            coalesce(round(100.0 * count(*) filter (where bk.status = 'no_show')
                           / nullif(count(*), 0)), 0)::int as pct
       from public.bookings bk
      where bk.business_id = $1
        and lower(bk.period) >= $2::timestamptz and lower(bk.period) < $3::timestamptz
        and lower(bk.period) <= $5::timestamptz
        and bk.status in ('pending_payment', 'confirmed', 'completed', 'no_show')
      group by 1`,
    [businessId, s, e, tz, now.toISOString()],
  );
  const nsBy = new Map(ns.rows.map((r) => [r.wk, r.pct]));

  return {
    weekly: weeks.map((w) => ({
      weekStart: w,
      revenueMinor: revBy.get(w) ?? 0,
    })),
    occupancyByStaff: await occupancy(q, businessId, now, tz),
    newVsReturning: weeks.map((w) => {
      const r = nvrBy.get(w);
      return {
        weekStart: w,
        nuevos: num(r?.nuevos),
        recurrentes: num(r?.recurrentes),
      };
    }),
    noShowTrend: weeks.map((w) => ({ weekStart: w, pct: nsBy.get(w) ?? 0 })),
  };
}

export async function loadInformes(
  userId: string,
  businessId: string,
  now: Date,
): Promise<InformesResult> {
  try {
    return await withOwnerTx(userId, async (q): Promise<InformesResult> => {
      const member = await loadMember(q, userId, businessId);
      if (!hasPerm(member, "can_view_reports")) return { forbidden: true };
      const tz = await loadBusinessTz(q, businessId);
      return loadInformesIn(q, businessId, now, tz);
    });
  } catch (e) {
    if (pgErrorCode(e) === "42501") return { forbidden: true };
    throw e;
  }
}
