import "server-only";

import type {
  IsoWeekday,
  LocalDate,
  LocalTime,
  TimeZone,
} from "@/lib/format/dates";

/** Profesional (uuid) eller "any" = "Cualquiera". */
export type StaffChoice = string;
export const ANY_STAFF = "any";

/** Styr min_notice/max_days_ahead (inv. 5) och gallring till 12 tider. */
export type Audience = "customer" | "owner";

export type Actor =
  | { kind: "customer" } // publika flödet: service role + explicit business_id
  | { kind: "owner"; userId: string }; // verifierad session (WP-15): RLS via rollbyte

/**
 * closed    = ingen arbetstid alls (stängt, all personal ledig) eller utanför
 *             [idag, idag + max_days_ahead] för kund
 * full      = arbetstid finns men inga lediga tider (F8: väntelista bara här)
 * available = minst en tid
 */
export type DayStatus = "available" | "full" | "closed";

export type AvailableDay = {
  date: LocalDate;
  status: DayStatus;
  hasFlash: false;
};

export type AvailableSlot = {
  /** ISO UTC; det enda som skickas tillbaka till createBooking. */
  start: string;
  /** "15:00" i företagets tidszon (etikett, formaterad på servern). */
  time: LocalTime;
  /** start + duration_min (bufferten syns inte för kunden, inv. 4). */
  end: string;
  /** Lediga profesionales vid `start`, i tilldelningsordning. */
  staffIds: string[];
};

// ---------------------------------------------------------------------------
// Ögonblicksbild för den rena kärnan (inga I/O, bara data)
// ---------------------------------------------------------------------------

/** Väggtid; `end` får vara "24:00" (nästa dags 00:00). */
export type HoursRow = {
  weekday: IsoWeekday;
  start: LocalTime;
  end: LocalTime;
};

export type BookingStatus =
  | "requested"
  | "pending_payment"
  | "confirmed"
  | "completed"
  | "no_show"
  /** WP-56: kunden begärde avbokning, väntar på företagets svar. */
  | "cancel_requested"
  | "cancelled";

/** Samma som villkoret i no_overlap (WP-01, WP-45: en förfrågan blockerar;
 * WP-56: en väntande avbokningsförfrågan håller tiden tills den godkänns). */
export const BLOCKING_STATUSES: readonly BookingStatus[] = [
  "requested",
  "pending_payment",
  "confirmed",
  "completed",
  "cancel_requested",
];

export type SnapshotStaff = {
  id: string;
  sort: number;
  active: boolean;
  /** Har en rad i staff_services för tjänsten. */
  offersService: boolean;
  /** null = inga staff_hours-rader alls: följer företagets öppettider. */
  hours: HoursRow[] | null;
};

export type SnapshotBooking = {
  id: string;
  staffId: string;
  /** lower(blocked) = lower(period), UTC ms. */
  start: number;
  /** upper(blocked) (inklusive buffert), UTC ms. */
  blockedEnd: number;
  status: BookingStatus;
};

/** staffId null = hela företaget (lunch, helgdag). */
export type SnapshotTimeOff = {
  staffId: string | null;
  start: number;
  end: number;
};

export type ScheduleSnapshot = {
  tz: TimeZone;
  minNoticeMinutes: number;
  maxDaysAhead: number;
  slotIntervalMinutes: number;
  businessHours: HoursRow[];
  staff: SnapshotStaff[];
  service: { durationMin: number; bufferAfterMin: number };
  /** Kortaste aktiva tjänstens längd (gallring, "tight packing"). */
  shortestServiceMin: number;
  timeOff: SnapshotTimeOff[];
  bookings: SnapshotBooking[];
};

export type DayInput = {
  snapshot: ScheduleSnapshot;
  date: LocalDate;
  staff: StaffChoice;
  audience: Audience;
  now: Date;
  /** Bokningen som flyttas räknas inte som upptagen (moveBooking). */
  excludeBookingId?: string;
};
