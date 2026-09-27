import "server-only";

import {
  fromLocal,
  isoWeekdayOf,
  type LocalDate,
  type TimeZone,
} from "@/lib/format/dates";

import {
  BLOCKING_STATUSES,
  type HoursRow,
  type ScheduleSnapshot,
  type SnapshotStaff,
} from "../types";
import { intersect, normalize, subtract, type Interval } from "./intervals";

/**
 * Öppettider är väggtid. Varje rad [start, end) för datumets veckodag
 * konverteras med `fromLocal(…, "compatible")` i båda ändar ("24:00" = nästa
 * dags 00:00), så intervallet får den verkliga längd som konverteringen ger:
 * en start i september-glappet flyttas fram, en tvetydig tid i april blir
 * första förekomsten (−03). Fönster slås aldrig ihop över midnatt.
 */
export function hoursToIntervals(
  rows: readonly HoursRow[],
  date: LocalDate,
  tz: TimeZone,
): Interval[] {
  const weekday = isoWeekdayOf(date);
  return normalize(
    rows
      .filter((r) => r.weekday === weekday)
      .map((r) => ({
        start: fromLocal(date, r.start, tz).getTime(),
        end: fromLocal(date, r.end, tz).getTime(),
      })),
  );
}

/**
 * business_hours(dag) ∩ staff_hours(dag). En profesional utan rader följer
 * företaget; med rader snävar de in och vidgar aldrig (inv. 3).
 */
export function workingWindows(
  snapshot: ScheduleSnapshot,
  staff: SnapshotStaff,
  date: LocalDate,
): Interval[] {
  const business = hoursToIntervals(snapshot.businessHours, date, snapshot.tz);
  if (staff.hours === null) return business;
  return intersect(business, hoursToIntervals(staff.hours, date, snapshot.tz));
}

/** Frånvaro för hela företaget (staff_id null) eller för profesionalen. */
export function timeOffFor(
  snapshot: ScheduleSnapshot,
  staffId: string,
): Interval[] {
  return snapshot.timeOff
    .filter((t) => t.staffId === null || t.staffId === staffId)
    .map((t) => ({ start: t.start, end: t.end }));
}

/** `blocked` för bokningar som blockerar (samma statusar som no_overlap). */
export function busyFor(
  snapshot: ScheduleSnapshot,
  staffId: string,
  excludeBookingId?: string,
): Interval[] {
  return snapshot.bookings
    .filter(
      (b) =>
        b.staffId === staffId &&
        b.id !== excludeBookingId &&
        BLOCKING_STATUSES.includes(b.status),
    )
    .map((b) => ({ start: b.start, end: b.blockedEnd }));
}

/** Arbetsfönster − frånvaro (utan bokningar): skiljer outside_hours från slot_taken. */
export function availableWindows(
  snapshot: ScheduleSnapshot,
  staff: SnapshotStaff,
  date: LocalDate,
): Interval[] {
  return subtract(
    workingWindows(snapshot, staff, date),
    timeOffFor(snapshot, staff.id),
  );
}

/** Arbetsfönster − frånvaro − blocked (bokning + buffert). */
export function freeWindows(
  snapshot: ScheduleSnapshot,
  staff: SnapshotStaff,
  date: LocalDate,
  excludeBookingId?: string,
): Interval[] {
  return subtract(
    availableWindows(snapshot, staff, date),
    busyFor(snapshot, staff.id, excludeBookingId),
  );
}
