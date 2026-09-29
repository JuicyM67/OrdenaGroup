// Rena funktioner (vy-modell → text/datum), ingen React. Se docs/tasks/plans/WP-12.md steg 2.
// Formatering bara via src/lib/format/, text bara via @/i18n (hård regel/DESIGN.md §10).
import {
  addLocalDays,
  eachLocalDate,
  formatLocalDate,
  formatTimeRange,
  fromLocal,
  parseInstant,
  startOfLocalWeek,
  toLocalDate,
  utcOffsetMinutes,
  type LocalDate,
  type LocalTime,
  type TimeZone,
} from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { maskPhone } from "@/lib/format/phone";
import { agenda, calendario, comun, estados } from "@/i18n";

import type { AgendaBooking, StaffColor } from "./types";

/** ISO 8601 med offset → `Date`. Fixture-/DB-data litar vi på (programmeringsfel annars). */
export function toInstant(iso: string): Date {
  const r = parseInstant(iso);
  if (!r.ok)
    throw new RangeError(`agenda: instant ogiltig (${r.error}): ${iso}`);
  return r.value;
}

/**
 * Den lokala dagen (`tz`) för en bokning/ett blocks `start` (ISO, valfri offset).
 * Bara `toLocalDate(toInstant(iso), tz)`, aldrig `iso.startsWith(date)` — UTC-strängar
 * (t.ex. från Postgres) hamnar annars på fel dag när UTC-datumet skiljer sig från det
 * lokala i Santiago (granskningsfynd, se agenda-screen.tsx/day-grid.tsx).
 */
export function localDateOf(iso: string, tz: TimeZone): LocalDate {
  return toLocalDate(toInstant(iso), tz);
}

/** `bg-staff-N`/`text-on-dark` — literala klasser (Tailwind kan inte se `bg-staff-${n}`). */
const STAFF_BG_CLASS: Record<StaffColor, string> = {
  1: "bg-staff-1",
  2: "bg-staff-2",
  3: "bg-staff-3",
  4: "bg-staff-4",
  5: "bg-staff-5",
  6: "bg-staff-6",
};

export function staffBgClass(color: StaffColor): string {
  return STAFF_BG_CLASS[color];
}

/** Måndagen + de sex följande dagarna i samma vecka som `focus`. */
export function weekDates(focus: LocalDate): LocalDate[] {
  const monday = startOfLocalWeek(focus);
  return eachLocalDate(monday, addLocalDays(monday, 6));
}

/** Lokal "idag", för `now` injicerat av anroparen (aldrig `new Date()` i komponenten). */
export function focusDate(now: Date, tz: TimeZone): LocalDate {
  return toLocalDate(now, tz);
}

/** "Octubre 2026" för fokusdagens månad. */
export function weekTitle(focus: LocalDate): string {
  return formatLocalDate(focus, "monthYear");
}

const NOON = "12:00" as LocalTime;

/** "GMT−3"/"GMT−4" kl. 12:00 lokal tid den dagen (mån–lör har alltid samma offset i Chile). */
export function offsetLabel(date: LocalDate, tz: TimeZone): string {
  const noon = fromLocal(date, NOON, tz);
  const hours = Math.round(utcOffsetMinutes(noon, tz) / 60);
  return calendario.zonaHoraria({ offset: hours });
}

/** aria-label för `<section aria-label="Semana del … al …">`. */
export function sectionAria(desde: LocalDate, hasta: LocalDate): string {
  return agenda.semana({
    desde: formatLocalDate(desde, "dayMonthLong"),
    hasta: formatLocalDate(hasta, "dayMonthLong"),
  });
}

export type StatusChip = {
  readonly label: string;
  readonly tone: "success" | "neutral";
};

/**
 * "Llegó"/"No vino" om popoverns knappar redan satt det lokalt (WP-12 FRÅGA 7, `status`
 * "completed"/"no_show"), annars "Confirmó por WhatsApp" om kunden bekräftat, annars
 * ingen status-chip.
 */
export function statusChip(
  booking: Pick<AgendaBooking, "confirmedByCustomer" | "status">,
): StatusChip | null {
  if (booking.status === "completed") {
    return { label: estados.llego, tone: "success" };
  }
  if (booking.status === "no_show") {
    return { label: estados.noVino, tone: "neutral" };
  }
  return booking.confirmedByCustomer
    ? { label: estados.confirmoPorWhatsapp, tone: "success" }
    : null;
}

export type PopoverModel = {
  readonly name: string;
  readonly telefonoYVisita: string;
  readonly conProfesional: string;
  readonly fechaYRango: string;
  readonly payment: string;
  readonly statusChip: StatusChip | null;
};

/** Alt texten och beloppen popoverns rader visar, redan formaterade. */
export function popoverModel(
  booking: AgendaBooking,
  staffName: string,
  tz: TimeZone,
): PopoverModel {
  const start = toInstant(booking.start);
  const end = toInstant(booking.end);
  const price = formatMoney(booking.priceClp);
  const payment =
    booking.depositPaidClp != null && booking.depositPaidClp > 0
      ? agenda.popover.pagoLinea({
          precio: price,
          monto: formatMoney(booking.depositPaidClp),
        })
      : price;
  return {
    name: booking.clientName,
    telefonoYVisita: agenda.popover.telefonoYVisita({
      telefono: maskPhone(booking.phone),
      visita: comun.visita({ n: booking.visitNumber }),
    }),
    conProfesional: agenda.popover.conProfesional({ profesional: staffName }),
    fechaYRango: agenda.popover.fechaYRango({
      fecha: formatLocalDate(toLocalDate(start, tz), "weekdayDayMonthShort"),
      rango: formatTimeRange(start, end, tz),
    }),
    payment,
    statusChip: statusChip(booking),
  };
}

// ---------------------------------------------------------------------------
// weekdayMin: "Lu"…"Do" (MiniCalendar mörk, DayPill), via `formatLocalDate(date,
// "weekdayMin")` (src/lib/format/dates.ts, WP-10).
// ---------------------------------------------------------------------------
const REFERENCE_MONDAY = "2024-01-01" as LocalDate; // känt en måndag

export const weekdayMinLabels: readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
] = Array.from({ length: 7 }, (_, i) =>
  formatLocalDate(addLocalDays(REFERENCE_MONDAY, i), "weekdayMin"),
) as [string, string, string, string, string, string, string];
