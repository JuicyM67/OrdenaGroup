import "server-only";

import {
  toLocalDate,
  toWallClock,
  type LocalDate,
  type LocalTime,
  type TimeZone,
} from "@/lib/format/dates";

import { ANY_STAFF, type HoursRow, type ScheduleSnapshot } from "../types";
import { subtract, type Interval } from "./intervals";
import { allSlotsForDay } from "./slots";
import { hoursToIntervals } from "./windows";

/**
 * Profilens chips (WP-41): "Öppet nu · till HH:MM" och "Nästa lediga tid".
 * Rena funktioner av indata + injicerat `now`, samma väggtidsregler som
 * motorn (`hoursToIntervals`, sommartid via `fromLocal`).
 */

export type OpenNow = { open: true; closesAt: LocalTime } | { open: false };

/**
 * Öppet = `now` ligger i ett av dagens öppettidsfönster minus frånvaro för
 * hela företaget (helgdag, lunch; `time_off.staff_id is null`). `closesAt`
 * är fönstrets slut i väggtid (en stängning för lunch räknas som stängning).
 */
export function openNow(
  hours: readonly HoursRow[],
  businessClosures: readonly Interval[],
  now: Date,
  tz: TimeZone,
): OpenNow {
  const t = now.getTime();
  const today = toLocalDate(now, tz);
  const windows = subtract(
    hoursToIntervals(hours, today, tz),
    businessClosures,
  );
  const w = windows.find((x) => x.start <= t && t < x.end);
  if (!w) return { open: false };
  return { open: true, closesAt: toWallClock(new Date(w.end), tz).time };
}

/**
 * Första lediga starttid (UTC ms) för tjänsten i ögonblicksbilden, med
 * "Cualquiera" och kundens regler (min_notice, max_days_ahead), bland
 * `dates` i ordning. `null` om ingen finns.
 */
export function firstFreeStart(
  snapshot: ScheduleSnapshot,
  dates: readonly LocalDate[],
  now: Date,
): number | null {
  for (const date of dates) {
    const first = allSlotsForDay({
      snapshot,
      date,
      staff: ANY_STAFF,
      audience: "customer",
      now,
    })[0];
    if (first) return first.start;
  }
  return null;
}
