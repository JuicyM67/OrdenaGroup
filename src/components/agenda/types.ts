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
import type { BookingPackageInfo } from "@/components/packages/types";

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
  /** WP-24 (F10): rabatt i heltal CLP — "Marcar pagada" förifyller beloppet
   * med `priceClp - discountClp - (depositPaidClp ?? 0)`. `paymentId`: id:t
   * på bokningens senaste `approved`-betalning av kind `full`/`balance`
   * (`payments`), `null`/saknas = obetald — styr "Pagada"-chippen, om
   * "Marcar pagada" visas, och `paymentId` till "Anular pago". Valfria (som
   * `flashPct`/`answers`): saknas i design lab/äldre tester, som då varken
   * visar knappen eller chippen. */
  readonly discountClp?: Clp;
  readonly paymentId?: string | null;
  /** WP-40 (D-031): svaren på bokningsfrågorna, om det finns några
   * (`getBookingAnswersForBookings`/`listBookingAnswersIn`). Saknas fältet
   * (befintliga fixturer/tester) → ingen svarslista visas. */
  readonly answers?: readonly BookingAnswerView[];
  /** WP-54: `customers.is_member`. Saknas i design lab/äldre fixturer →
   * ingen "Socio"-chip i popovern. */
  readonly isMember?: boolean;
  /** WP-86 (D-072): paket som täcker bokningen eller redan använts för den.
   * Saknas = inget paket att visa. */
  readonly packageInfo?: BookingPackageInfo;
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

/** WP-23: en rad i väntelistkortets lista (Agenda-asiden). Bara `waiting`/
 * `offered` visas — `booked`/`expired`/`removed` är inte längre något
 * ägaren behöver agera på. */
export type AgendaWaitlistEntry = {
  readonly id: string;
  readonly customerName: string;
  readonly service: string;
  readonly status: "waiting" | "offered";
};

export type AgendaWaitlist = {
  readonly count: number;
  readonly day: LocalDate;
  readonly entries: readonly AgendaWaitlistEntry[];
} | null;

/** WP-30: en aktiv (ännu inte bokad) blixttid, ritad som ett eget block i
 * rutnätet (lime, samma ton som en bokad flash-bokning). */
export type AgendaFlashSlot = {
  readonly id: string;
  readonly staffId: StaffId;
  readonly start: string;
  readonly end: string;
  readonly discountPct: number;
};

/** WP-46: speglar `Perm`/`MemberView` (`src/server/db/permissions.ts`,
 * `src/server/owner/member.ts`), duplicerat — samma motiv som resten av
 * filen (en klientmodell importerar aldrig värden från `src/server/`). */
export type AgendaPerm =
  | "can_manage_own_bookings"
  | "can_manage_all_bookings"
  | "can_cancel_bookings"
  | "can_edit_catalog"
  | "can_manage_team"
  | "can_view_reports"
  | "can_edit_settings";

export type AgendaMemberView = {
  role: "owner" | "staff" | "vendor" | "admin" | null;
  staffId: StaffId | null;
  perms: Record<AgendaPerm, boolean>;
};

export type AgendaData = {
  /** ISO 8601 med offset. Injiceras alltid — komponenten anropar aldrig `new Date()`. */
  readonly now: string;
  readonly timezone: string;
  readonly business: { readonly hours: AgendaBusinessHours };
  readonly staff: readonly AgendaStaff[];
  readonly bookings: readonly AgendaBooking[];
  readonly blocks: readonly AgendaBlock[];
  readonly waitlist: AgendaWaitlist;
  /** WP-30: aktiva blixttider för veckan (ännu inte bokade). */
  readonly flashSlots: readonly AgendaFlashSlot[];
  readonly weekCounts: Record<StaffId, number>;
  /** Reservas per profesional för en given dag (dagvyns kolumnhuvud). */
  readonly dayCounts?: Record<LocalDate, Record<StaffId, number>>;
  /** WP-46: den inloggades roll/behörigheter — filtret "Mis reservas"/"Todo
   * el equipo" och vilka knappar (Mover/Llegó/No vino) som visas per bokning.
   * Saknas i design lab/äldre testfixturer → alla knappar visas som förut
   * (samma "ingen filtrering" som `hasPerm(undefined, …)` på servern). */
  readonly member?: AgendaMemberView;
};

/** WP-50: reservas per profesional för varje dag i en månad (månadsvyn), samma
 * form som `AgendaData["dayCounts"]` men för hela månaden. Returneras av
 * `loadOwnerAgendaMonthCounts` (`src/server/owner/agenda.ts`). */
export type MonthDayCounts = Record<LocalDate, Record<StaffId, number>>;

/** UX-granskning (sektion "Agenda", förslag "Fyllnadsstapel"): bokade minuter per dag,
 * summerat över alla profesionales (inte uppdelat per profesional — stapeln är en enda
 * siffra per dag). Returneras tillsammans med `MonthDayCounts` av `loadOwnerAgendaMonthCounts`. */
export type MonthDayMinutes = Record<LocalDate, number>;

/** `loadOwnerAgendaMonthCounts`s svar: räkningarna (prickarna/antalet) och minuterna
 * (fyllnadsstapeln) för en hel kalendermånad, i ett enda anrop. */
export type MonthData = {
  readonly counts: MonthDayCounts;
  readonly minutes: MonthDayMinutes;
};
