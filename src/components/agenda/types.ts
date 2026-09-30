// Vy-modell för Agenda (vecka + dag), se DESIGN.md §7 och docs/tasks/plans/WP-12.md steg 2.
// Modellen innehåller bara råa värden (instanter som ISO-strängar med offset, `LocalDate`,
// heltal CLP, telefon i E.164). UI räknar aldrig ut pengar eller lediga tider (hård regel 2) —
// formatering och geometri görs i geometry.ts/agenda-view.ts, aldrig i komponenterna direkt.
import type { LocalDate, LocalTime } from "@/lib/format/dates";
import type { E164 } from "@/lib/format/phone";
import type { Clp } from "@/lib/format/clp";
// `import type` raderas helt vid kompilering (ingen JS-emission), så den
// här filen kan vara "use client"-säker trots att `answers.ts` har
// `import "server-only"` som värde-import (samma mönster som
// `booking/types.ts`, WP-40).
import type { BookingAnswerView } from "@/server/booking-questions/answers";
import type { Database } from "@/types/database";

/** 1..6, se `--color-staff-1`…`--color-staff-6` i tokens.css. */
export type StaffColor = 1 | 2 | 3 | 4 | 5 | 6;

export type BookingSource = Database["public"]["Enums"]["booking_source"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];
export type TimeOffKind = Database["public"]["Enums"]["time_off_kind"];

export type StaffId = string;

export type AgendaStaff = {
  readonly id: StaffId;
  readonly name: string;
  readonly initials?: string;
  readonly color: StaffColor;
};

export type AgendaBooking = {
  readonly id: string;
  /** WP-26 steg 7 (F12): `customers.id`, för "Exportar datos"/"Anonimizar
   * cliente" i popovern (`event-popover.tsx`). Saknas i design lab/testfixturer
   * som inte bryr sig om dataskyddsåtgärderna — döljer då bara de knapparna. */
  readonly customerId?: string;
  readonly staffId: StaffId;
  /** ISO 8601 med offset, t.ex. "2026-10-02T11:30:00-03:00". */
  readonly start: string;
  readonly end: string;
  readonly clientName: string;
  readonly phone: E164;
  readonly visitNumber: number;
  readonly service: string;
  readonly priceClp: Clp;
  readonly depositPaidClp: Clp | null;
  readonly source: BookingSource;
  readonly status: BookingStatus;
  readonly confirmedByCustomer: boolean;
  /** Rabatt i procent för en hora flash, t.ex. 20. */
  readonly flashPct?: number;
  /** WP-40 (D-031): svaren på bokningsfrågorna, om det finns några
   * (`getBookingAnswersForBookings`/`listBookingAnswersIn`). Saknas fältet
   * (befintliga fixturer/tester) → ingen svarslista visas. */
  readonly answers?: readonly BookingAnswerView[];
};

export type AgendaBlock = {
  readonly staffId: StaffId;
  readonly start: string;
  readonly end: string;
  readonly kind: TimeOffKind;
};

/** En eller flera öppettidsintervall per ISO-veckodag (1 = måndag). Ingen nyckel = stängt. */
export type AgendaBusinessHours = Partial<
  Record<
    1 | 2 | 3 | 4 | 5 | 6 | 7,
    readonly { open: LocalTime; close: LocalTime }[]
  >
>;

export type AgendaWaitlist = {
  readonly count: number;
  readonly day: LocalDate;
} | null;

export type AgendaData = {
  /** ISO 8601 med offset. Injiceras alltid — komponenten anropar aldrig `new Date()`. */
  readonly now: string;
  readonly timezone: string;
  readonly business: { readonly hours: AgendaBusinessHours };
  readonly staff: readonly AgendaStaff[];
  readonly bookings: readonly AgendaBooking[];
  readonly blocks: readonly AgendaBlock[];
  readonly waitlist: AgendaWaitlist;
  readonly weekCounts: Record<StaffId, number>;
  /** Reservas per profesional för en given dag (dagvyns kolumnhuvud). */
  readonly dayCounts?: Record<LocalDate, Record<StaffId, number>>;
};
