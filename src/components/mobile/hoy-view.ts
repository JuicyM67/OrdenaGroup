// Rena funktioner för Hoy (Hoy.dc.html), se docs/tasks/plans/WP-14.md §4 steg 1. Ingen dold
// klocka: `now` tas alltid emot som parameter. Formatering bara via `src/lib/format/`, text
// bara via `@/i18n`.
import { estados, hoy } from "@/i18n/es-CL";
import {
  formatDate,
  localDayRange,
  minutesBetween,
  parseInstant,
  SANTIAGO,
  toLocalDate,
} from "@/lib/format/dates";

import type { HoyBooking } from "./types";

/** ISO-sträng → Date. Fixtures ägs av oss, så ett ogiltigt värde är ett programmeringsfel. */
export function parseInstantOrThrow(instant: string): Date {
  const result = parseInstant(instant);
  if (!result.ok) {
    throw new RangeError(
      `hoy-view: instant ogiltig "${instant}" (${result.error})`,
    );
  }
  return result.value;
}

/**
 * Initialer ur ett fullständigt namn, t.ex. "Camila Rojas" → "CR". Tillfällig lokal
 * implementation: hör egentligen hemma i `src/lib/format/` (scheduling-engineer, se
 * WP-14-planen §3 "Externa beroenden"), men den PR:en är inte mergad än och WP-14 äger
 * inte den mappen. Flyttas dit utan ändrad signatur när den landar.
 */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

/** "Viernes 2 de octubre" i America/Santiago. */
export function todayLabel(now: Date): string {
  return formatDate(now, SANTIAGO, "weekdayDayMonthLong");
}

const OPEN_STATUSES = new Set(["confirmed", "pending_payment"]);

function isEligibleToday(
  b: HoyBooking,
  now: Date,
  dayStart: Date,
  dayEnd: Date,
): boolean {
  if (!OPEN_STATUSES.has(b.status)) return false;
  const start = parseInstantOrThrow(b.start);
  const end = parseInstantOrThrow(b.end);
  if (start < dayStart || start >= dayEnd) return false;
  if (end <= now) return false;
  return true;
}

/**
 * Den tidigaste bokningen under den lokala dagen (`localDayRange`) med status
 * `confirmed`/`pending_payment` och `end > now`. Klara, `no_show` och avbokade hoppas över.
 * En pågående bokning (start < now < end) räknas som nästa kund ("atrasado").
 */
export function nextBooking(
  bookings: readonly HoyBooking[],
  now: Date,
): HoyBooking | undefined {
  const { start: dayStart, end: dayEnd } = localDayRange(
    toLocalDate(now, SANTIAGO),
    SANTIAGO,
  );
  return bookings
    .filter((b) => isEligibleToday(b, now, dayStart, dayEnd))
    .sort(
      (a, b) =>
        parseInstantOrThrow(a.start).getTime() -
        parseInstantOrThrow(b.start).getTime(),
    )[0];
}

/**
 * Dagens kommande och pågående bokningar utom nästa kund, sorterade på instant.
 * Samma behörighetsregler som `nextBooking`.
 */
export function restOfDay(
  bookings: readonly HoyBooking[],
  now: Date,
  next: HoyBooking | undefined,
): HoyBooking[] {
  const { start: dayStart, end: dayEnd } = localDayRange(
    toLocalDate(now, SANTIAGO),
    SANTIAGO,
  );
  return bookings
    .filter((b) => b.id !== next?.id)
    .filter((b) => isEligibleToday(b, now, dayStart, dayEnd))
    .sort(
      (a, b) =>
        parseInstantOrThrow(a.start).getTime() -
        parseInstantOrThrow(b.start).getTime(),
    );
}

/**
 * "en 20 min" / "en 1 h" / "en 1 h 5 min" / "ahora" / "7 min de atraso". Verklig tid
 * (`minutesBetween`, inte väggtid) — korrekt även vid ett sommartidsbyte mellan `now` och
 * `start`.
 */
export function relative(now: Date, start: Date): string {
  const diff = Math.round(minutesBetween(now, start));
  if (diff === 0) return hoy.relativo.ahora;
  if (diff < 0) return hoy.relativo.atrasado({ n: -diff });
  if (diff < 60) return hoy.relativo.enMin({ n: diff });
  return hoy.relativo.enHoras({ h: Math.floor(diff / 60), m: diff % 60 });
}

export type NextChip = { tone: "success" | "pending"; label: string };

/** Bekräftad av kunden → success ("Confirmó"), annars pending ("Sin confirmar"). */
export function nextChip(b: HoyBooking): NextChip {
  return b.confirmedByCustomer
    ? { tone: "success", label: estados.confirmo }
    : { tone: "pending", label: estados.sinConfirmar };
}

export type RowTag = { tone: "lime" | "peach" | "peach-50"; label: string };

/** Högst en tagg, med prioritet Flash > Desde lista > Abono, annars ingen (FRÅGA 6). */
export function rowTag(b: HoyBooking): RowTag | undefined {
  if (b.source === "flash") return { tone: "lime", label: estados.flash };
  if (b.source === "waitlist")
    return { tone: "peach", label: estados.desdeLista };
  if (b.depositPaidClp > 0) return { tone: "peach-50", label: estados.abono };
  return undefined;
}
