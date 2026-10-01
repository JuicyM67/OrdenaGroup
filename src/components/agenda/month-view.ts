// WP-50: rena funktioner för agendans månadsvy (rutnät, sammanfattning per dag, aria-text).
// Ingen React, formatering bara via src/lib/format/, text bara via @/i18n (samma regel som
// agenda-view.ts). `buildMonthGrid` (mini-calendar/grid.ts) gör all datumaritmetik (måndag
// först, sommartid-säker UTC-aritmetik, redan testad i grid.test.ts) — den här filen bygger
// bara vidare på den med bokningsdata.
import {
  buildMonthGrid,
  type MonthCell,
  type YearMonth,
} from "@/components/ui/mini-calendar/grid";
import {
  formatLocalDate,
  isoWeekdayOf,
  minutesBetween,
  type LocalDate,
  type LocalTime,
  type TimeZone,
} from "@/lib/format/dates";
import { agenda } from "@/i18n";

import { localDateOf, toInstant } from "./agenda-view";
import type {
  AgendaBooking,
  AgendaBusinessHours,
  MonthDayCounts,
  MonthDayMinutes,
  StaffColor,
  StaffId,
} from "./types";

/** Max antal prickar per dagcell (fler profesionales än så visas inte var för sig). */
const MAX_DOTS = 4;

export type MonthDaySummary = {
  readonly count: number;
  readonly staffColors: readonly StaffColor[];
};

/** Veckor à 7 dagar (måndag–söndag), utfyllt till hela veckor. Se `MonthGrid`. */
export function monthWeeks(month: YearMonth): MonthCell[][] {
  return buildMonthGrid(month.year, month.month);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** "Octubre 2026" för en given månad. */
export function monthTitle(month: YearMonth): string {
  const first =
    `${String(month.year).padStart(4, "0")}-${pad2(month.month)}-01` as LocalDate;
  return formatLocalDate(first, "monthYear");
}

/** Stängd hela dagen enligt öppettiderna för dagens veckodag. */
export function isMonthDayClosed(
  date: LocalDate,
  hours: AgendaBusinessHours,
): boolean {
  const ranges = hours[isoWeekdayOf(date)];
  return !ranges || ranges.length === 0;
}

/**
 * `MonthDayCounts` (antal per profesional och dag) → en sammanfattning per dag: totalt
 * antal + de distinkta profesionalfärgerna (för prickarna), capat till `MAX_DOTS`.
 */
export function summarizeMonthCounts(
  counts: MonthDayCounts,
  staffColorById: ReadonlyMap<StaffId, StaffColor>,
): ReadonlyMap<LocalDate, MonthDaySummary> {
  const result = new Map<LocalDate, MonthDaySummary>();
  for (const [date, byStaff] of Object.entries(counts) as [
    LocalDate,
    Record<StaffId, number>,
  ][]) {
    let total = 0;
    const colors: StaffColor[] = [];
    for (const [staffId, n] of Object.entries(byStaff) as [StaffId, number][]) {
      total += n;
      if (n <= 0) continue;
      const color = staffColorById.get(staffId);
      if (color !== undefined && !colors.includes(color)) colors.push(color);
    }
    if (total > 0) {
      result.set(date, {
        count: total,
        staffColors: colors.slice(0, MAX_DOTS),
      });
    }
  }
  return result;
}

/**
 * Reservfallet när ingen server-loader finns (design lab, WP-50 FRÅGA):
 * räknar bara de bokningar som redan finns i `data.bookings` (en enda vecka i
 * den riktiga appen) och som faller inom den efterfrågade månaden — bättre än
 * inget alls, men fullständigt bara när anroparen faktiskt gett en hel månads
 * bokningar (t.ex. en design lab-fixtur byggd för det).
 */
export function monthCountsFromBookings(
  bookings: readonly AgendaBooking[],
  month: YearMonth,
  tz: TimeZone,
): MonthDayCounts {
  const prefix = `${String(month.year).padStart(4, "0")}-${pad2(month.month)}`;
  const counts: Record<string, Record<StaffId, number>> = {};
  for (const b of bookings) {
    const date = localDateOf(b.start, tz);
    if (!date.startsWith(prefix)) continue; // `date` är redan en lokal LocalDate, inte en instant.
    const byStaff = counts[date] ?? {};
    byStaff[b.staffId] = (byStaff[b.staffId] ?? 0) + 1;
    counts[date] = byStaff;
  }
  return counts;
}

/** aria-label för en dagcell i månadsrutnätet (`MonthGrid`). */
export function monthCellAria(
  date: LocalDate,
  closed: boolean,
  count: number,
  full = false,
): string {
  const fecha = formatLocalDate(date, "weekdayDayMonthLong");
  if (closed) return agenda.mes.celdaCerradaAria({ fecha });
  if (full) return agenda.mes.celdaLlenaAria({ fecha });
  return count > 0
    ? agenda.mes.celdaConReservasAria({ fecha, n: count })
    : agenda.mes.celdaSinReservasAria({ fecha });
}

/**
 * Reservfallet när ingen server-loader finns (design lab), motsvarigheten till
 * `monthCountsFromBookings` fast för fyllnadsstapeln: bokade minuter per dag, summerat
 * över alla profesionales.
 */
export function monthMinutesFromBookings(
  bookings: readonly AgendaBooking[],
  month: YearMonth,
  tz: TimeZone,
): MonthDayMinutes {
  const prefix = `${String(month.year).padStart(4, "0")}-${pad2(month.month)}`;
  const minutes: Record<string, number> = {};
  for (const b of bookings) {
    const date = localDateOf(b.start, tz);
    if (!date.startsWith(prefix)) continue;
    const dur = minutesBetween(toInstant(b.start), toInstant(b.end));
    minutes[date] = (minutes[date] ?? 0) + dur;
  }
  return minutes;
}

/** Öppna minuter en given veckodag, summerat över alla intervall (en profesional = en
 * gång). `0` en stängd dag. */
function openMinutesPerStaffOfWeekday(
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7,
  hours: AgendaBusinessHours,
): number {
  const ranges = hours[weekday];
  if (!ranges) return 0;
  return ranges.reduce((sum, r) => sum + minutesOfRange(r.open, r.close), 0);
}

function minutesOfRange(open: LocalTime, close: LocalTime): number {
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  return (ch ?? 0) * 60 + (cm ?? 0) - ((oh ?? 0) * 60 + (om ?? 0));
}

/** UX-granskning (sektion "Agenda"): hur full en dag är, 0–100 (kan gå över 100 om
 * dubbelbokningar/overbooking skulle förekomma — kapas vid rendering, inte här). `null` =
 * stängd dag (ingen stapel), `undefined` = dagen är utanför den efterfrågade månaden. */
export type MonthDayFill = { readonly pct: number; readonly full: boolean };

/**
 * Fyllnadsstapeln per dag (andel bokad tid av öppen tid): `minutes` (bokade minuter,
 * summerat över alla profesionales) delat på öppna minuter den dagen gånger antalet
 * aktiva profesionales (varje profesional har kapacitet för hela öppettiden, samma
 * förenkling som `isMonthDayClosed` redan gör — bara företagets öppettider, inte
 * enskilda scheman).
 */
export function summarizeMonthFill(
  minutesByDate: MonthDayMinutes,
  hours: AgendaBusinessHours,
  staffCount: number,
): ReadonlyMap<LocalDate, MonthDayFill> {
  const result = new Map<LocalDate, MonthDayFill>();
  for (const [date, minutes] of Object.entries(minutesByDate) as [
    LocalDate,
    number,
  ][]) {
    if (minutes <= 0) continue;
    const weekday = isoWeekdayOf(date);
    const openPerStaff = openMinutesPerStaffOfWeekday(weekday, hours);
    const capacity = openPerStaff * Math.max(staffCount, 1);
    if (capacity <= 0) continue;
    const pct = Math.round((minutes / capacity) * 100);
    result.set(date, { pct, full: pct >= 95 });
  }
  return result;
}
