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
  type LocalDate,
  type TimeZone,
} from "@/lib/format/dates";
import { agenda } from "@/i18n";

import { localDateOf } from "./agenda-view";
import type {
  AgendaBooking,
  AgendaBusinessHours,
  MonthDayCounts,
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
    for (const [staffId, n] of Object.entries(byStaff) as [
      StaffId,
      number,
    ][]) {
      total += n;
      if (n <= 0) continue;
      const color = staffColorById.get(staffId);
      if (color !== undefined && !colors.includes(color)) colors.push(color);
    }
    if (total > 0) {
      result.set(date, { count: total, staffColors: colors.slice(0, MAX_DOTS) });
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
): string {
  const fecha = formatLocalDate(date, "weekdayDayMonthLong");
  if (closed) return agenda.mes.celdaCerradaAria({ fecha });
  return count > 0
    ? agenda.mes.celdaConReservasAria({ fecha, n: count })
    : agenda.mes.celdaSinReservasAria({ fecha });
}
