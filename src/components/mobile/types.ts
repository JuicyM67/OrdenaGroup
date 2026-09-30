// Vy-modell för Hoy (Hoy.dc.html), se docs/design/DESIGN.md §7 "NextClientCard",
// "QuickActionTile", "MobileTabBar" och WP-14-planen §4 (gemensamma regler för WP-11–14).
//
// Bara råa värden här: instanter som ISO-strängar med offset, heltal CLP, `now` injiceras
// av anroparen. UI räknar aldrig ut pengar eller lediga tider (hård regel 2) — `dayCount`
// och `dayTotalClp` gäller hela dagen och kommer färdiga från servern.
// `import type` raderas helt vid kompilering (ingen JS-emission), så den
// här filen kan vara "use client"-säker trots att `answers.ts` har
// `import "server-only"` som värde-import (samma mönster som
// `agenda/types.ts`, WP-40).
import type { PendingRequestItem } from "@/components/shared/notification-bell";
import type { BookingAnswerView } from "@/server/booking-questions/answers";
import type { Database } from "@/types/database";

export type { PendingRequestItem };

export type BookingStatus = Database["public"]["Enums"]["booking_status"];
export type BookingSource = Database["public"]["Enums"]["booking_source"];

/** Personalfärg 1..6, se `--color-staff-1`…`-6` i tokens.css. */
export type StaffColor = 1 | 2 | 3 | 4 | 5 | 6;

export type HoyBooking = {
  id: string;
  /** Instant, ISO 8601 med offset (t.ex. "2026-10-02T15:00:00-03:00"). */
  start: string;
  /** Instant, ISO 8601 med offset. */
  end: string;
  clientName: string;
  service: string;
  /** WP-46: profesionalens personalrad-id — filtret "Mis reservas"/"Todo el
   * equipo" och behörigheten för Llegó/No vino (`NextClientCard`). */
  staffId: string;
  staffName: string;
  staffColor: StaffColor;
  status: BookingStatus;
  confirmedByCustomer: boolean;
  /** Heltal CLP, 0 om inget abono är betalt. */
  depositPaidClp: number;
  /** WP-24 (F10): tjänstens pris och rabatt, heltal CLP — "Marcar pagada"
   * förifyller beloppet med `priceClp - discountClp - depositPaidClp`.
   * `paymentId`: id:t på bokningens senaste `approved`-betalning av kind
   * `full`/`balance`, `null`/saknas = obetald — styr "Pagada"-taggen, om
   * "Marcar pagada" visas, och `paymentId` till "Anular pago". Alla tre är
   * valfria (som `answers`): saknas i design lab-fixturer/äldre tester, som
   * då varken visar knappen eller taggen. */
  priceClp?: number;
  discountClp?: number;
  paymentId?: string | null;
  source: BookingSource;
  /** 1 = första besöket. Källa till `comun.visita`. */
  visitNumber: number;
  /** WP-40 (D-031): svaren på bokningsfrågorna, om det finns några. Saknas
   * fältet (befintliga fixturer/tester) → ingen svarslista visas. */
  answers?: readonly BookingAnswerView[];
  /** WP-54: `customers.is_member`. Saknas i design lab/äldre fixturer →
   * ingen "Socio"-etikett. */
  isMember?: boolean;
};

export type HoyLinks = {
  flash: string;
  waitlist: string;
  cobrar: string;
  tabs: {
    hoy: string;
    agenda: string;
    clientes: string;
    caja: string;
  };
};

/** WP-46: speglar `Perm`/`MemberView` (`src/server/db/permissions.ts`,
 * `src/server/owner/member.ts`), duplicerat — samma motiv som resten av filen. */
export type HoyPerm =
  | "can_manage_own_bookings"
  | "can_manage_all_bookings"
  | "can_cancel_bookings"
  | "can_edit_catalog"
  | "can_manage_team"
  | "can_view_reports"
  | "can_edit_settings";

export type HoyMemberView = {
  role: "owner" | "staff" | "vendor" | "admin" | null;
  staffId: string | null;
  perms: Record<HoyPerm, boolean>;
};

export type HoyData = {
  /** Instant, ISO 8601 med offset. Aldrig `new Date()` i komponenten. */
  now: string;
  owner: { name: string };
  /** WP-46: filtret "Mis reservas"/"Todo el equipo" och Llegó/No vino på
   * `NextClientCard`. Saknas (design lab/äldre sidor) → allt visas som förut. */
  member?: HoyMemberView;
  /** Sant ersätter både nästa-kund-kortet och listan med "Hoy no atiendes." */
  closedToday: boolean;
  bookings: HoyBooking[];
  /** Antal reservationer för hela dagen (inte bara de synliga raderna). */
  dayCount: number;
  /** Summa för hela dagen, heltal CLP. */
  dayTotalClp: number;
  waitlistCount: number;
  /** WP-45 (D-033): solicitudes (`requested`) pendientes de confirmar —
   * fuente de la campana (`NotificationBell`), reemplaza al antiguo contador
   * `unreadNotifications`. */
  pendingRequests: PendingRequestItem[];
  links: HoyLinks;
};
