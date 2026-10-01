// Rena funktioner för Hoy (Hoy.dc.html), se docs/tasks/plans/WP-14.md §4 steg 1. Ingen dold
// klocka: `now` tas alltid emot som parameter. Formatering bara via `src/lib/format/`, text
// bara via `@/i18n`.
import { PAGADA_LABEL } from "@/components/caja/types";
import { estados, hoy } from "@/i18n";
import {
  formatDate,
  localDayRange,
  minutesBetween,
  parseInstant,
  APP_TZ,
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

/** "Viernes 2 de octubre" i appens tidszon. */
export function todayLabel(now: Date): string {
  return formatDate(now, APP_TZ, "weekdayDayMonthLong");
}

// WP-45 (D-033): "requested" här också — annars försvinner en väntande förfrågan
// helt ur "Siguiente"/"Resto del día" (granskningsfynd i WP-45-planen: ett
// allowlist-filter som `<> 'cancelled'` inte hade missat). WP-56: samma
// resonemang för "cancel_requested" — tiden är fortfarande blockerad
// (`BLOCKING_STATUSES`) tills ägaren svarar, och ska synas med sin egen
// etikett (`rowTag`) i stället för att se ut som en vanlig bekräftad tid.
const OPEN_STATUSES = new Set([
  "confirmed",
  "pending_payment",
  "requested",
  "cancel_requested",
]);

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
    toLocalDate(now, APP_TZ),
    APP_TZ,
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
    toLocalDate(now, APP_TZ),
    APP_TZ,
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

/**
 * WP-57 (UX-genomgång, Hoy: "40 min de atraso syns knappt" → röd chip i stället för grå
 * text). `null` om bokningen inte är försenad ännu (`now` före `start`) — annars
 * `hoy.relativo.atrasado`, samma text som `relative()` redan ger, bara isolerad så
 * `NextClientCard` kan välja chip i stället för vanlig text.
 */
export function latenessLabel(now: Date, start: Date): string | null {
  const diff = Math.round(minutesBetween(now, start));
  return diff < 0 ? hoy.relativo.atrasado({ n: -diff }) : null;
}

export type NextChip = {
  tone: "success" | "pending" | "deposit";
  label: string;
};

/** WP-45 (D-033): en väntande förfrågan (`requested`) → "Por confirmar", före
 * kundens egen bekräftelse (annat begrepp, `confirmed_by_customer_at`).
 * WP-56: en väntande avbokningsförfrågan (`cancel_requested`) → "Cancelación
 * pendiente" (tono `deposit`, eget utseende). Annars: bekräftad av kunden →
 * success ("Confirmó"), annars pending ("Sin confirmar"). */
export function nextChip(b: HoyBooking): NextChip {
  if (b.status === "requested") {
    return { tone: "pending", label: estados.porConfirmar };
  }
  if (b.status === "cancel_requested") {
    return { tone: "deposit", label: estados.cancelacionPendiente };
  }
  return b.confirmedByCustomer
    ? { tone: "success", label: estados.confirmo }
    : { tone: "pending", label: estados.sinConfirmar };
}

export type RowTag = {
  tone: "lime" | "peach" | "peach-50" | "pending" | "success" | "deposit";
  label: string;
};

/** WP-54: "Socio" — visas ALLTID (utöver `rowTag`s högst-en-tagg), inte bara
 * när ingen annan tagg vunnit, så en betald/flash-bokning av en socio
 * fortfarande visar båda. */
export function isMemberBooking(b: HoyBooking): boolean {
  return b.isMember === true;
}

/** Högst en tagg. WP-45 (D-033): "Por confirmar" (en väntande förfrågan) och
 * WP-56: "Cancelación pendiente" (en väntande avbokningsförfrågan, eget
 * utseende `deposit` — se `event-block.tsx`) går före allt annat — annars
 * Flash > Desde lista > Abono > Pagada (WP-24, lägst prioritet: en betald
 * "flash"-bokning visar ändå "Flash" här). */
export function rowTag(b: HoyBooking): RowTag | undefined {
  if (b.status === "requested") {
    return { tone: "pending", label: estados.porConfirmar };
  }
  if (b.status === "cancel_requested") {
    return { tone: "deposit", label: estados.cancelacionPendiente };
  }
  if (b.source === "flash") return { tone: "lime", label: estados.flash };
  if (b.source === "waitlist")
    return { tone: "peach", label: estados.desdeLista };
  if (b.depositPaidClp > 0) return { tone: "peach-50", label: estados.abono };
  if (b.paymentId) return { tone: "success", label: PAGADA_LABEL };
  return undefined;
}
