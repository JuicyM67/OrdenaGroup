import "server-only";

import {
  localDayRange,
  parseLocalTime,
  parseTimeZone,
  toLocalDate,
  type IsoWeekday,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";
import type { Queryable } from "@/server/db/pool";

import { err, ok, type Result } from "./result";
import {
  BLOCKING_STATUSES,
  type BookingStatus,
  type HoursRow,
  type ScheduleSnapshot,
  type SnapshotStaff,
} from "./types";

/**
 * Laddar ögonblicksbilden för ett företag, en tjänst och ett datumintervall.
 * Högst 6 frågor oberoende av antalet dagar (R10). Varje fråga filtrerar på
 * `business_id = $1` (även med service role, gränstest). Kundfält läses aldrig.
 * Med `withOwnerTx` gäller RLS dessutom: ett annat företag ger inga rader.
 */

export type LoadedSnapshot = {
  snapshot: ScheduleSnapshot;
  /** businesses.status = 'active'. Kundvägen nekas annars (business_unavailable). */
  businessActive: boolean;
  priceClp: number;
  cancelWindowHours: number;
  /** businesses.auto_confirm_bookings (WP-45): kundens bokning blir
   * `confirmed` direkt i stället för `requested`. */
  autoConfirm: boolean;
};

type BusinessServiceRow = {
  timezone: string;
  status: string;
  min_notice_minutes: number;
  max_days_ahead: number;
  cancel_window_hours: number;
  auto_confirm_bookings: boolean;
  slot_interval_minutes: number;
  duration_min: number;
  buffer_after_min: number;
  price_clp: number;
  shortest: number | null;
};

type HoursDbRow = {
  staff_id?: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

function toHours(r: HoursDbRow): HoursRow {
  const start = parseLocalTime(r.start_time);
  const end = parseLocalTime(r.end_time, { allowEndOfDay: true });
  if (!start.ok || !end.ok) throw new RangeError("load: ogiltig öppettid");
  return {
    weekday: r.weekday as IsoWeekday,
    start: start.value as LocalTime,
    end: end.value as LocalTime,
  };
}

export type LoadInput = {
  businessId: string;
  serviceId: string;
  /** Lokala datum [from, to], eller den lokala dagen för en instant. */
  range: { from: LocalDate; to: LocalDate } | { around: Date };
  /** Flytt av en befintlig bokning: tjänsten får ha inaktiverats sedan dess. */
  includeInactiveService?: boolean;
};

export async function loadSnapshot(
  q: Queryable,
  input: LoadInput,
): Promise<Result<LoadedSnapshot, "service_not_offered">> {
  const { businessId, serviceId } = input;

  // 1. Företagets inställningar + tjänsten (aktiv) + kortaste aktiva tjänst.
  const head = await q.query<BusinessServiceRow>(
    `select b.timezone, b.status::text as status, b.min_notice_minutes, b.max_days_ahead,
            b.cancel_window_hours, b.auto_confirm_bookings,
            b.slot_interval_minutes,
            s.duration_min, s.buffer_after_min, s.price_clp,
            (select min(x.duration_min) from public.services x
              where x.business_id = $1 and x.active) as shortest
       from public.businesses b
       join public.services s on s.business_id = b.id
      where b.id = $1 and s.business_id = $1 and s.id = $2
        and (s.active or $3::boolean)`,
    [businessId, serviceId, input.includeInactiveService === true],
  );
  const h = head.rows[0];
  if (!h) return err("service_not_offered");
  const tz = parseTimeZone(h.timezone);
  if (!tz.ok) throw new RangeError("load: ogiltig tidszon");

  const days =
    "around" in input.range
      ? {
          from: toLocalDate(input.range.around, tz.value),
          to: toLocalDate(input.range.around, tz.value),
        }
      : input.range;
  const rangeStartIso = localDayRange(days.from, tz.value).start.toISOString();
  const rangeEndIso = localDayRange(days.to, tz.value).end.toISOString();

  // 2. Personal och om de utför tjänsten.
  const staffRows = await q.query<{
    id: string;
    sort: number;
    active: boolean;
    offers: boolean;
  }>(
    `select st.id, st.sort, st.active,
            exists (select 1 from public.staff_services ss
                     where ss.business_id = $1 and ss.staff_id = st.id
                       and ss.service_id = $2) as offers
       from public.staff st
      where st.business_id = $1`,
    [businessId, serviceId],
  );

  // 3. Företagets öppettider.
  const bh = await q.query<HoursDbRow>(
    `select weekday, start_time::text as start_time, end_time::text as end_time
       from public.business_hours where business_id = $1`,
    [businessId],
  );

  // 4. Personalens tider.
  const sh = await q.query<HoursDbRow>(
    `select staff_id, weekday, start_time::text as start_time,
            end_time::text as end_time
       from public.staff_hours where business_id = $1`,
    [businessId],
  );

  // 5. Frånvaro som överlappar intervallet.
  const to = await q.query<{ staff_id: string | null; s: number; e: number }>(
    `select staff_id,
            extract(epoch from lower(period))::float8 * 1000 as s,
            extract(epoch from upper(period))::float8 * 1000 as e
       from public.time_off
      where business_id = $1
        and period && tstzrange($2::timestamptz, $3::timestamptz, '[)')`,
    [businessId, rangeStartIso, rangeEndIso],
  );

  // 6. Blockerande bokningar som överlappar intervallet (blocked = inkl. buffert).
  const bk = await q.query<{
    id: string;
    staff_id: string;
    s: number;
    e: number;
    status: BookingStatus;
  }>(
    `select id, staff_id, status::text as status,
            extract(epoch from lower(blocked))::float8 * 1000 as s,
            extract(epoch from upper(blocked))::float8 * 1000 as e
       from public.bookings
      where business_id = $1
        and blocked && tstzrange($2::timestamptz, $3::timestamptz, '[)')
        and status = any($4::public.booking_status[])`,
    [businessId, rangeStartIso, rangeEndIso, BLOCKING_STATUSES],
  );

  const hoursByStaff = new Map<string, HoursRow[]>();
  for (const r of sh.rows) {
    const list = hoursByStaff.get(r.staff_id!) ?? [];
    list.push(toHours(r));
    hoursByStaff.set(r.staff_id!, list);
  }
  const staff: SnapshotStaff[] = staffRows.rows.map((r) => ({
    id: r.id,
    sort: r.sort,
    active: r.active,
    offersService: r.offers,
    hours: hoursByStaff.get(r.id) ?? null,
  }));

  return ok({
    businessActive: h.status === "active",
    priceClp: h.price_clp,
    cancelWindowHours: h.cancel_window_hours,
    autoConfirm: h.auto_confirm_bookings,
    snapshot: {
      tz: tz.value,
      minNoticeMinutes: h.min_notice_minutes,
      maxDaysAhead: h.max_days_ahead,
      slotIntervalMinutes: h.slot_interval_minutes,
      businessHours: bh.rows.map(toHours),
      staff,
      service: {
        durationMin: h.duration_min,
        bufferAfterMin: h.buffer_after_min,
      },
      shortestServiceMin: h.shortest ?? h.duration_min,
      timeOff: to.rows.map((r) => ({
        staffId: r.staff_id,
        start: Math.round(r.s),
        end: Math.round(r.e),
      })),
      bookings: bk.rows.map((r) => ({
        id: r.id,
        staffId: r.staff_id,
        start: Math.round(r.s),
        blockedEnd: Math.round(r.e),
        status: r.status,
      })),
    },
  });
}
