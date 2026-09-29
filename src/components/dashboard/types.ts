// Vy-modell för Inicio (Main.dc.html), se docs/tasks/plans/WP-11.md §4 steg 2.
// Råa värden bara: instanter som ISO-strängar med offset, `LocalDate`, belopp som heltal
// CLP, procentenheter som tal (`formatPercent`). Ingen text, ingen egen formatering —
// initialer (`initialsOf`) och procent (`formatPercent`) räknas alltid ur `name`/`noShowPct`
// vid renderingen, aldrig lagrade som text i datan.
// Riktig tillgänglighet/priser kommer från servern (WP-21), inte uträknat i UI (hård regel 2).
import type { AvatarProps } from "@/components/ui/avatar";
import type { LocalDate } from "@/lib/format/dates";
import type { Clp } from "@/lib/format/clp";
import type { Database } from "@/types/database";

export type BookingStatus = Database["public"]["Enums"]["booking_status"];

export type TodayBooking = {
  id: string;
  /** ISO 8601 med offset, t.ex. "2026-10-02T15:00:00-03:00". */
  start: string;
  /**
   * ISO 8601 med offset. Tillagd utöver planens sammanfattade `TodayBooking` (§4 steg 2):
   * `upcomingToday` behöver ett slut för att avgöra "pågående" mot "avslutad" (§5, testet
   * "en bokning som pågår (start 14:30, now 14:40) syns. En som slutat syns inte.") —
   * riktig tillgänglighet/tider kommer alltid från servern, aldrig uträknat i UI.
   */
  end: string;
  /** "Joaquín Rivas" — initialerna till Avatar räknas med `initialsOf()` (agenda-row.tsx). */
  clientName: string;
  service: string;
  staff: string;
  tint: NonNullable<AvatarProps["tone"]>;
  status: BookingStatus;
  depositPaid: boolean;
  confirmedByCustomer: boolean;
};

export type InicioData = {
  /** Injicerad klocka, ISO 8601 med offset. Aldrig `new Date()` i komponenten. */
  now: string;
  business: {
    name: string;
    comuna: string;
  };
  owner: {
    /** "Camila R." — initialerna till UserPill räknas med `initialsOf()` (inicio-screen.tsx). */
    name: string;
    /** "Camila" — hero-hälsningen (`inicio.hola`). Klar från datan, ingen egen
     * namnformatering i UI:t (QA). */
    firstName: string;
  };
  notifications: { count: number };
  week: {
    recoveredHours: number;
    recoveredClp: Clp;
  };
  features: {
    waitlist: { count: number; day: LocalDate; progress: number };
    flash: { active: number; booked: number; progress: number };
    winback: { count: number };
  };
  stats: {
    bookingsToday: number;
    toConfirm: number;
    revenueWeekClp: Clp;
    revenueSeries: number[];
    /** Procentenheter (som `formatPercent()` tar), t.ex. `4` → "4%". */
    noShowPct: number;
    noShowTrend: "down" | "up" | "flat";
  };
  today: TodayBooking[];
  /**
   * Nästa (upp till 10) obekräftade/kommande bokningar från och med `now`, oavsett dag —
   * inte bara innevarande vecka (WP-fixar-sv: ägaren missade en bokning för nästa vecka
   * eftersom Agenda bara visar en vecka i taget). Samma radform som `today`
   * (`TodayBooking`), så `AgendaRow`/`statusChip` kan återanvändas.
   */
  upcoming: TodayBooking[];
  calendar: {
    month: { year: number; month: number };
    markedDates: LocalDate[];
  };
  activeFlash: {
    start: string;
    discountPct: number;
    service: string;
    staff: string;
  } | null;
};
