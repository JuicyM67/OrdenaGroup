// Ren geometri, ingen React. Alla mått i px, se docs/design/reference/Agenda.dc.html
// (renderVals: HOUR=94, TOP=20) och docs/tasks/plans/WP-12.md steg 2. Testas mot
// --agenda-hour/--agenda-gutter i tokens.css (geometry.test.ts).
import { isoWeekdayOf, toWallClock, minutesBetween } from "@/lib/format/dates";
import type { LocalDate, TimeZone } from "@/lib/format/dates";

import type { AgendaBusinessHours } from "./types";

/** Höjd per timme i veckovyn/dagvyn (bara i src/components/agenda/**, se DESIGN.md §12). */
export const HOUR_PX = 94;
/** Tidskolumnens bredd. */
export const GUTTER_PX = 64;
/** Avstånd mellan panelens topp och det första synliga klockslaget. */
export const TOP_PX = 20;
/** Höger marginal i rutnätet. */
export const RIGHT_PX = 8;
/** Dras av händelsens höjd (litet mellanrum till nästa block), se renderVals() `ev()`. */
export const EVENT_GAP_PX = 4;
/** Kolumnhuvudets höjd i dagvyn (0 i veckovyn). */
export const DAY_HEADER_PX = 44;

function wallHourDecimal(instant: Date, tz: TimeZone): number {
  const wall = toWallClock(instant, tz);
  const [hh, mm] = wall.time.split(":") as [string, string];
  return Number(hh) + Number(mm) / 60;
}

export type EventBox = { readonly top: number; readonly height: number };

/**
 * Placering av ett block: `top` räknas på väggtiden (toWallClock), `height` på verklig
 * längd (minutesBetween) — inte på skillnaden mellan väggtider, som inte finns entydigt
 * över ett sommartidsbyte.
 */
export function eventBox(
  start: Date,
  end: Date,
  gridStartHour: number,
  tz: TimeZone,
): EventBox {
  const startHour = wallHourDecimal(start, tz);
  const top = TOP_PX + (startHour - gridStartHour) * HOUR_PX;
  const height = (minutesBetween(start, end) / 60) * HOUR_PX - EVENT_GAP_PX;
  return { top, height };
}

/** Höjd ≥ 44 px: blocket visar tid/undertext (renderVals: `showTime`). */
export function showTime(heightPx: number): boolean {
  return heightPx >= 44;
}

/** Höjd ≥ 96 px: blocket visar en avataruta (renderVals: `showAvatar`). */
export function showAvatar(heightPx: number): boolean {
  return heightPx >= 96;
}

/**
 * Nu-linjens `top`, eller `null` om `now` ligger utanför rutnätets synliga fönster
 * ([gridStartHour, gridEndHour]).
 */
export function nowTop(
  now: Date,
  gridStartHour: number,
  gridEndHour: number,
  tz: TimeZone,
): number | null {
  const hour = wallHourDecimal(now, tz);
  if (hour < gridStartHour || hour > gridEndHour) return null;
  return TOP_PX + (hour - gridStartHour) * HOUR_PX;
}

export type HourRange = {
  readonly startHour: number;
  readonly endHour: number;
};

/**
 * Tidigaste öppning till senaste stängning i veckan, avrundat till hela timmar
 * (renderVals: START=10, hours 10..16 → stängning 17:00, se WP-12 steg 2/plan §"gridHours").
 * Ingen öppettid alls den veckan → hela dygnet (0–24), så rutnätet inte kollapsar.
 */
export function gridHours(
  hours: AgendaBusinessHours,
  weekDates: readonly LocalDate[],
): HourRange {
  let startHour = Number.POSITIVE_INFINITY;
  let endHour = Number.NEGATIVE_INFINITY;
  for (const date of weekDates) {
    const ranges = hours[isoWeekdayOf(date)];
    if (!ranges) continue;
    for (const range of ranges) {
      const [openH] = range.open.split(":").map(Number) as [number, number];
      const [closeH, closeM] = range.close.split(":").map(Number) as [
        number,
        number,
      ];
      startHour = Math.min(startHour, Math.floor(openH));
      endHour = Math.max(endHour, closeM > 0 ? closeH + 1 : closeH);
    }
  }
  if (!Number.isFinite(startHour) || !Number.isFinite(endHour)) {
    return { startHour: 0, endHour: 24 };
  }
  return { startHour, endHour };
}
