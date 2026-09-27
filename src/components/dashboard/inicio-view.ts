// Rena funktioner för Inicio-skärmen (Main.dc.html), se docs/tasks/plans/WP-11.md §4 steg 2.
// Ingen React, inget `new Date()` här — klockan tas alltid emot som parameter.
import { estados, inicio, nav } from "@/i18n";
import {
  SANTIAGO,
  formatDate,
  localDayRange,
  parseInstant,
  toLocalDate,
} from "@/lib/format/dates";

import type { InicioData, TodayBooking } from "./types";

/** Delad av agenda-row.tsx/flash-card.tsx: ISO-sträng (med offset) → Date, eller kastar. */
export function mustParseInstant(iso: string, fn: string): Date {
  const r = parseInstant(iso);
  if (!r.ok) {
    throw new RangeError(`${fn}: instant ogiltig "${iso}" (${r.error})`);
  }
  return r.value;
}

/** "Viernes 2 de octubre" (Santiago, oavsett webbläsarens/processens tidszon). */
export function todayLabel(now: Date): string {
  return formatDate(now, SANTIAGO, "weekdayDayMonthLong");
}

/**
 * Dagens bokningar som fortfarande är aktuella: pågående eller kommande under den
 * *lokala* dagen (`localDayRange`, inte `+24 h` — det ger fel gräns kring sommartid,
 * se docs/tasks/plans/WP-11.md §5). Sorterade på starttid (instant, inte väggtid, så
 * en tvetydig dubbeltimme sorteras rätt).
 */
export function upcomingToday(
  bookings: readonly TodayBooking[],
  now: Date,
): TodayBooking[] {
  const today = toLocalDate(now, SANTIAGO);
  const { start: dayStart, end: dayEnd } = localDayRange(today, SANTIAGO);
  const nowMs = now.getTime();
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();

  return bookings
    .map((booking) => ({
      booking,
      startMs: mustParseInstant(booking.start, "upcomingToday").getTime(),
      endMs: mustParseInstant(booking.end, "upcomingToday").getTime(),
    }))
    .filter(
      ({ startMs, endMs }) =>
        startMs >= dayStartMs && startMs < dayEndMs && endMs > nowMs,
    )
    .sort((a, b) => a.startMs - b.startMs)
    .map(({ booking }) => booking);
}

export type StatusChipTone = "success" | "deposit" | "pending";

/** Abono pagado vinner över "confirmada" (samma prioritet som Hoy/Agenda). */
export function statusChip(
  b: Pick<TodayBooking, "depositPaid" | "confirmedByCustomer">,
): { tone: StatusChipTone; text: string } {
  if (b.depositPaid) return { tone: "deposit", text: estados.abonoPagado };
  if (b.confirmedByCustomer) {
    return { tone: "success", text: estados.confirmada };
  }
  return { tone: "pending", text: estados.sinConfirmar };
}

export function heroVariant(week: InicioData["week"]): "recuperado" | "vacio" {
  return week.recoveredHours > 0 ? "recuperado" : "vacio";
}

/** `nav.notificaciones` utan aviseringar, annars `nav.notificacionesNuevas({ n })`. */
export function notificationsLabel(count: number): string {
  return count > 0
    ? nav.notificacionesNuevas({ n: count })
    : nav.notificaciones;
}

/** "bajando" / "subiendo" / "igual" (FRÅGA 8: down = success, up = deposit, flat = neutral). */
export function noShowTrendLabel(
  trend: InicioData["stats"]["noShowTrend"],
): string {
  if (trend === "down") return inicio.stats.tendencia.bajando;
  if (trend === "up") return inicio.stats.tendencia.subiendo;
  return inicio.stats.tendencia.igual;
}

/**
 * "Camila R." → "Camila", para el saludo del hero (`inicio.hola`). El header/UserPill usa
 * el nombre completo (`owner.name`); el hero de la referencia solo usa el primer nombre.
 * No es formateo de fecha/dinero/teléfono (`src/lib/format/`) sino una lectura directa del
 * dato ya recibido, así que vive acá igual que las demás funciones de vista de Inicio.
 */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

/**
 * Delar en redan sammansatt copy-sträng (`inicio.hero.resumen`) i tre delar så att
 * mittdelen kan färgas lime utan att UI:t bygger en egen mallsträng. Om `part` inte finns
 * i `full` (eller är tom) är hela texten omarkerad. Vid flera förekomster används den
 * första.
 */
export function splitHighlight(
  full: string,
  part: string,
): [before: string, highlighted: string, after: string] {
  if (part === "") return [full, "", ""];
  const i = full.indexOf(part);
  if (i === -1) return [full, "", ""];
  return [full.slice(0, i), part, full.slice(i + part.length)];
}
