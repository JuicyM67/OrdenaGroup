import "server-only";

import {
  fromLocal,
  parseInstant,
  SANTIAGO,
  type IsoWeekday,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";

import type {
  BookingStatus,
  HoursRow,
  ScheduleSnapshot,
  SnapshotBooking,
  SnapshotStaff,
  SnapshotTimeOff,
} from "../types";

/**
 * "Barbería Norte" som ren data för kärntesterna: mån–lör 10:00–19:00,
 * Diego/Matías/Tomás, tre tjänster. Lunch 13:30–14:30 läggs till per datum
 * med `lunch(date)` (time_off för hela företaget).
 */

export const DIEGO = "00000000-0000-4000-8000-000000000001";
export const MATIAS = "00000000-0000-4000-8000-000000000002";
export const TOMAS = "00000000-0000-4000-8000-000000000003";

export const CORTE = { durationMin: 35, bufferAfterMin: 0 };
export const BARBA = { durationMin: 20, bufferAfterMin: 0 };
export const CORTE_BARBA = { durationMin: 50, bufferAfterMin: 10 };

export const d = (s: string) => s as LocalDate;
export const t = (s: string) => s as LocalTime;

/** Lokal väggtid i Santiago → UTC ms ("compatible"). */
export function at(date: string, time: string): number {
  return fromLocal(d(date), t(time), SANTIAGO).getTime();
}

/** ISO-instant → ms (fixturer med exakt UTC). */
export function utc(s: string): number {
  const r = parseInstant(s);
  if (!r.ok) throw new Error(`fixture: ${s}`);
  return r.value.getTime();
}

export function nowAt(date: string, time: string): Date {
  return new Date(at(date, time));
}

export function hours(
  weekdays: number[],
  start: string,
  end: string,
): HoursRow[] {
  return weekdays.map((w) => ({
    weekday: w as IsoWeekday,
    start: t(start),
    end: t(end),
  }));
}

export const MON_SAT = [1, 2, 3, 4, 5, 6];
export const ALL_WEEK = [1, 2, 3, 4, 5, 6, 7];

export function staff(
  id: string,
  sort: number,
  extra: Partial<SnapshotStaff> = {},
): SnapshotStaff {
  return { id, sort, active: true, offersService: true, hours: null, ...extra };
}

let seq = 0;

export function booking(
  staffId: string,
  date: string,
  time: string,
  durationMin: number,
  opts: { bufferMin?: number; status?: BookingStatus; id?: string } = {},
): SnapshotBooking {
  const start = at(date, time);
  seq++;
  return {
    id: opts.id ?? `b-${seq}`,
    staffId,
    start,
    blockedEnd: start + (durationMin + (opts.bufferMin ?? 0)) * 60_000,
    status: opts.status ?? "confirmed",
  };
}

export function timeOff(
  staffId: string | null,
  date: string,
  from: string,
  to: string,
  toDate: string = date,
): SnapshotTimeOff {
  return { staffId, start: at(date, from), end: at(toDate, to) };
}

export function lunch(date: string): SnapshotTimeOff {
  return timeOff(null, date, "13:30", "14:30");
}

export function norte(over: Partial<ScheduleSnapshot> = {}): ScheduleSnapshot {
  return {
    tz: SANTIAGO,
    minNoticeMinutes: 60,
    maxDaysAhead: 30,
    slotIntervalMinutes: 15,
    businessHours: hours(MON_SAT, "10:00", "19:00"),
    staff: [staff(DIEGO, 1), staff(MATIAS, 2), staff(TOMAS, 3)],
    service: CORTE,
    shortestServiceMin: 20,
    timeOff: [],
    bookings: [],
    ...over,
  };
}

/**
 * Sena öppettider för sommartidstester: lördag 22:00–24:00 och söndag
 * 00:00–02:00 (bytena sker natten mellan lördag och söndag).
 */
export function late(over: Partial<ScheduleSnapshot> = {}): ScheduleSnapshot {
  return norte({
    businessHours: [
      ...hours([6], "22:00", "24:00"),
      ...hours([7], "00:00", "02:00"),
    ],
    staff: [staff(DIEGO, 1)],
    ...over,
  });
}
