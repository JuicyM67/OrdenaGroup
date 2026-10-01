import "server-only";

// UX-granskning (sección "Blixttider", 2026-10-01): tomma läget sa tidigare ingenting om
// vad en Blixttid är och tvingade ägaren att själv hitta en ledig tid. `listFreeGaps` gör
// det jobbet — lediga luckor idag och imorgon, per profesional, minst lika långa som
// profesionalens kortaste aktiva tjänst (annars är luckan ändå ingen tjänst kan bokas i).
//
// Smal läsfunktion (jämför `loadOwnerAgendaMonthCountsIn`s filkommentar): ingen pris- eller
// bokningsdata som `src/server/scheduling/load.ts`s `loadSnapshot` (den är bunden till EN
// tjänst). Bygger i stället en egen minimal `ScheduleSnapshot` av samma rader
// (`business_hours`/`staff_hours`/`time_off`/`bookings`, samma kolumner som `loadSnapshot`
// steg 3–6) och återanvänder kärnans rena `freeWindows` (`core/windows.ts`) — samma
// beräkning som tillgängligheten, D-021: en lucka är alltid riktig, aldrig en egen
// beräkning i UI:t.
import {
  addLocalDays,
  localDayRange,
  parseLocalTime,
  toLocalDate,
  APP_TZ,
  type IsoWeekday,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx } from "@/server/db/tx";
import { systemClock } from "@/server/scheduling/clock";
import { freeWindows } from "@/server/scheduling/core/windows";
import {
  BLOCKING_STATUSES,
  type BookingStatus,
  type HoursRow,
  type ScheduleSnapshot,
  type SnapshotStaff,
} from "@/server/scheduling/types";

export type FreeGap = {
  staffId: string;
  staffName: string;
  date: LocalDate;
  /** ISO UTC. */
  start: string;
  end: string;
};

/** "Lediga luckor idag och i morgon … max 8" (planen). */
const MAX_GAPS = 8;

type HoursDbRow = {
  staff_id?: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

/** Samma tolkning som `loadSnapshot`s lokala `toHours` (load.ts) — duplicerad hellre än
 * importerad: den är inte exporterad därifrån, och den här filen vill inte bero på en
 * funktion bunden till en enda tjänst. */
function toHours(r: HoursDbRow): HoursRow {
  const start = parseLocalTime(r.start_time);
  const end = parseLocalTime(r.end_time, { allowEndOfDay: true });
  if (!start.ok || !end.ok) {
    throw new RangeError("listFreeGaps: ogiltig öppettid");
  }
  return {
    weekday: r.weekday as IsoWeekday,
    start: start.value as LocalTime,
    end: end.value as LocalTime,
  };
}

export async function listFreeGaps(
  userId: string,
  businessId: string,
  now: Date = systemClock(),
): Promise<FreeGap[]> {
  return withOwnerTx(userId, (q) => listFreeGapsIn(q, businessId, now));
}

/** Inre steg (för tester): kör i anroparens transaktion. */
export async function listFreeGapsIn(
  q: Queryable,
  businessId: string,
  now: Date,
): Promise<FreeGap[]> {
  const today = toLocalDate(now, APP_TZ);
  const tomorrow = addLocalDays(today, 1);
  const rangeStart = localDayRange(today, APP_TZ).start;
  const rangeEnd = localDayRange(tomorrow, APP_TZ).end;

  const staffRes = await q.query<{ id: string; name: string }>(
    `select id, name from public.staff
      where business_id = $1 and active
      order by sort, name`,
    [businessId],
  );
  if (staffRes.rows.length === 0) return [];

  // Kortaste AKTIVA tjänstens längd per profesional (`staff_services`, bara de tjänster
  // hen faktiskt utför) — en profesional utan kopplade tjänster kan inte få en Blixttid.
  const shortestRes = await q.query<{ staff_id: string; shortest: number }>(
    `select ss.staff_id, min(sv.duration_min) as shortest
       from public.staff_services ss
       join public.services sv
         on sv.business_id = ss.business_id and sv.id = ss.service_id and sv.active
      where ss.business_id = $1
      group by ss.staff_id`,
    [businessId],
  );
  const shortestByStaff = new Map(
    shortestRes.rows.map((r) => [r.staff_id, r.shortest]),
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
  const to = await q.query<{ staff_id: string | null; s: number; e: number }>(
    `select staff_id,
            extract(epoch from lower(period))::float8 * 1000 as s,
            extract(epoch from upper(period))::float8 * 1000 as e
       from public.time_off
      where business_id = $1
        and period && tstzrange($2, $3, '[)')`,
    [businessId, rangeStart, rangeEnd],
  );
  const bk = await q.query<{
    staff_id: string;
    s: number;
    e: number;
    status: BookingStatus;
  }>(
    `select staff_id, status::text as status,
            extract(epoch from lower(blocked))::float8 * 1000 as s,
            extract(epoch from upper(blocked))::float8 * 1000 as e
       from public.bookings
      where business_id = $1
        and blocked && tstzrange($2, $3, '[)')
        and status = any($4::public.booking_status[])`,
    [businessId, rangeStart, rangeEnd, BLOCKING_STATUSES],
  );

  const hoursByStaff = new Map<string, HoursRow[]>();
  for (const r of sh.rows) {
    const list = hoursByStaff.get(r.staff_id!) ?? [];
    list.push(toHours(r));
    hoursByStaff.set(r.staff_id!, list);
  }

  // Minimal `ScheduleSnapshot`: `freeWindows`/`workingWindows`/`availableWindows`/
  // `busyFor`/`timeOffFor` (core/windows.ts) läser bara `tz`/`businessHours`/`timeOff`/
  // `bookings`/`staff.hours`/`staff.id` — `service`/`shortestServiceMin`/
  // `minNoticeMinutes`/`maxDaysAhead`/`slotIntervalMinutes` används inte av dem, så de får
  // ofarliga platshållarvärden i stället för att läsas in i onödan.
  const snapshot: ScheduleSnapshot = {
    tz: APP_TZ,
    minNoticeMinutes: 0,
    maxDaysAhead: 1,
    slotIntervalMinutes: 15,
    businessHours: bh.rows.map(toHours),
    staff: [],
    service: { durationMin: 0, bufferAfterMin: 0 },
    shortestServiceMin: 0,
    timeOff: to.rows.map((r) => ({
      staffId: r.staff_id,
      start: Math.round(r.s),
      end: Math.round(r.e),
    })),
    bookings: bk.rows.map((r, i) => ({
      id: `gap-${i}`,
      staffId: r.staff_id,
      start: Math.round(r.s),
      blockedEnd: Math.round(r.e),
      status: r.status,
    })),
  };

  const gaps: FreeGap[] = [];
  for (const s of staffRes.rows) {
    const shortest = shortestByStaff.get(s.id);
    if (!shortest) continue;
    const staffObj: SnapshotStaff = {
      id: s.id,
      sort: 0,
      active: true,
      offersService: true,
      hours: hoursByStaff.get(s.id) ?? null,
    };
    for (const date of [today, tomorrow] as const) {
      for (const w of freeWindows(snapshot, staffObj, date)) {
        // Idag: en lucka som redan börjat (`w.start < now`) klipps till `now` i stället för
        // att visas som ledig i det förflutna.
        const start =
          date === today ? Math.max(w.start, now.getTime()) : w.start;
        if (w.end - start < shortest * 60_000) continue;
        gaps.push({
          staffId: s.id,
          staffName: s.name,
          date,
          start: new Date(start).toISOString(),
          end: new Date(w.end).toISOString(),
        });
      }
    }
  }
  gaps.sort((a, b) => a.start.localeCompare(b.start));
  return gaps.slice(0, MAX_GAPS);
}
