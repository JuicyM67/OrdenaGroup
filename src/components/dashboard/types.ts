// Vy-modell för Inicio (Main.dc.html), se docs/tasks/plans/WP-11.md §4 steg 2.
// Råa värden bara: instanter som ISO-strängar med offset, `LocalDate`, belopp som heltal
// CLP, procentenheter som tal (`formatPercent`). Ingen text, ingen egen formatering —
// initialer (`initialsOf`) och procent (`formatPercent`) räknas alltid ur `name`/`noShowPct`
// vid renderingen, aldrig lagrade som text i datan.
// Riktig tillgänglighet/priser kommer från servern (WP-21), inte uträknat i UI (hård regel 2).
import type { SmsBellNotice } from "@/lib/validation/sms-credits";
import type { AvatarProps } from "@/components/ui/avatar";
import type { PendingRequestItem } from "@/components/shared/notification-bell";
import type { LocalDate } from "@/lib/format/dates";
import type { Clp } from "@/lib/format/clp";
import type { Database } from "@/types/database";

export type { PendingRequestItem };

export type BookingStatus = Database["public"]["Enums"]["booking_status"];

/** Speglar `MemberView` (`src/server/owner/member.ts`), duplicerad — en
 * "use client"-fil (`inicio-screen.tsx`) importerar aldrig något, inte ens
 * bara typer, under `@/server/*` (samma regel som `AgendaMemberView`/
 * `HoyMemberView` i agenda/types.ts, mobile/types.ts, och `TeamPerms` i
 * settings/team-section.tsx). WP-24 (D-034): döljer Caja i navigeringen. */
export type InicioMemberView = {
  role: "owner" | "staff" | "vendor" | "admin" | null;
  staffId: string | null;
  perms: {
    can_manage_own_bookings: boolean;
    can_manage_all_bookings: boolean;
    can_cancel_bookings: boolean;
    can_edit_catalog: boolean;
    can_manage_team: boolean;
    can_view_reports: boolean;
    can_edit_settings: boolean;
  };
};

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
  /** WP-45 (D-033): solicitudes (`requested`) pendientes de confirmar —
   * fuente compartida por la campana (`NotificationBell`) y la lista "Att
   * bekräfta" arriba de todo en Inicio (se oculta cuando está vacía). */
  notifications: {
    items: PendingRequestItem[];
    /** WP-76 (D-053): sms-varningar i klockan (bara ägaren i SE). */
    notices?: SmsBellNotice[];
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
  /** WP-24 (D-034): döljer Caja i navigeringen (`MainNav`/`OwnerMobileTabBar`) för
   * medlemmar utan `can_view_reports`. `loadOwnerInicio` sätter alltid fältet
   * (`memberView`), design lab-fixturer kan utelämna det (nav:en visar då Caja). */
  member?: InicioMemberView;
  /**
   * WP-57 (punkt 4, UX-genomgång "Kom igång-kort med progress"): fem steg härledda ur
   * befintlig data (inget nytt "onboarding klar"-fält) — `GettingStartedCard` döljs av
   * anroparen när alla fem är `true`. `undefined` (design lab/äldre fixturer) döljer kortet
   * helt i stället för att visa falska steg.
   */
  gettingStarted?: {
    services: boolean;
    hours: boolean;
    profile: boolean;
    flash: boolean;
    team: boolean;
  };
};
