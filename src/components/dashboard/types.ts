// Vy-modell för Inicio (Main.dc.html), se docs/tasks/plans/WP-11.md §4 steg 2.
// Råa värden bara: instanter som ISO-strängar med offset, `LocalDate`, belopp som heltal
// CLP. Ingen text, inga formaterade strängar (utom där lib-funktionen ännu inte finns, se
// kommentarerna i fixtures.ts/calendar-card.tsx — markerat med TODO(WP-10)).
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
  clientName: string;
  /** "JR". Fixtures förser den redan färdig (`initialsOf`, WP-10, saknas ännu). */
  initials: string;
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
    name: string;
    /** "CR". Om den saknas: fixtures förser den redan färdig (initialsOf, WP-10, saknas
     * ännu — se docs/tasks/plans/WP-11.md FRÅGA 6). */
    initials?: string;
  };
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
    /**
     * "4%", redan formaterad. TODO(WP-10): byt till `noShowPct: number` +
     * `formatPercent()` (src/lib/format/) när den funktionen finns på main (se
     * docs/tasks/plans/WP-11.md FRÅGA 6) — fixtures bär texten tills dess i stället för
     * att WP-11 skriver en egen variant av formatPercent.
     */
    noShowPctText: string;
    noShowTrend: "down" | "up" | "flat";
  };
  today: TodayBooking[];
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
