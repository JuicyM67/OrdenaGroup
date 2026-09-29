/**
 * Vy-modell för kundens länk `/r/[token]` (WP-16 steg 5, D-029). Rena
 * funktioner: klockan injiceras (`now`), aldrig `new Date()` här — samma
 * mönster som `src/components/dashboard/inicio-view.ts`.
 *
 * `ManagedBooking` importeras bara som typ (`import type`): filen som
 * definierar den (`@/server/bookings/manage.ts`) har `import "server-only"`
 * som värde-import, men ett typ-only-import raderas helt vid kompilering och
 * drar aldrig in den koden i klientbunten — samma motivering som
 * `booking/types.ts` (qa-granskning WP-13, item 11). Den re-exporteras
 * härifrån (i stället för att `manage-screen.tsx` importerar den direkt):
 * den filen har `"use client"` överst, och `boundaries.test.ts` flaggar
 * *alla* `@/server/*`-importspecifikationer (textmatchning, skiljer inte på
 * `import type`) i en sådan fil — den här filen saknar pragmat och är den
 * godkända indirektionspunkten, precis som `booking/types.ts`.
 */
import { formatDate, formatTime, parseInstant, type TimeZone } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import type { ManagedBooking } from "@/server/bookings/manage";

export type { ManagedBooking };

/** ISO-sträng (med offset) → Date, kastar på ogiltig instant. Kommer alltid
 * från servern (`loadBookingByToken`), så det här borde aldrig hända. */
export function mustParseInstant(iso: string, fn: string): Date {
  const r = parseInstant(iso);
  if (!r.ok) {
    throw new RangeError(`${fn}: instant ogiltig "${iso}" (${r.error})`);
  }
  return r.value;
}

/** Serverns svar på avbokningen (`cancelByToken`s `Result`, plattat till en
 * klientsäker form — `BookingError` importeras bara som typ, av samma skäl
 * som `ManagedBooking` ovan). */
export type ManageCancelResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: string };

/**
 * `cancelled`/`past` är dödlägen (bara `ctaReservarOtraHora`, WP-16-planen
 * §6). `locked` = fortfarande aktiv men utanför avbokningsfönstret
 * (`gestion.fueraDePlazo`). `cancellable` visar avboka-knappen.
 */
export type ManageState = "cancelled" | "past" | "locked" | "cancellable";

export function manageState(booking: ManagedBooking, now: Date): ManageState {
  if (booking.status === "cancelled") return "cancelled";
  const end = mustParseInstant(booking.end, "manageState");
  if (now.getTime() >= end.getTime()) return "past";
  if (!booking.canCancel) return "locked";
  return "cancellable";
}

export interface ManageFields {
  readonly servicio: string;
  readonly dia: string;
  readonly hora: string;
  readonly profesional: string;
  readonly direccion: string;
  readonly precio: string;
}

/** Bokningskortets fält, redan formaterade (företagets tidszon, aldrig
 * webbläsarens/processens). Adressen faller tillbaka på comunan — inte alla
 * företag har en gatuadress ifylld (`businesses.address` är valfri). */
export function manageFields(booking: ManagedBooking): ManageFields {
  const tz = booking.business.timezone as TimeZone;
  const start = mustParseInstant(booking.start, "manageFields");
  return {
    servicio: booking.serviceName,
    dia: formatDate(start, tz, "weekdayDayMonthLong"),
    hora: formatTime(start, tz),
    profesional: booking.staffName,
    direccion: booking.business.address ?? booking.business.comuna,
    precio: formatMoney(booking.priceClp),
  };
}
