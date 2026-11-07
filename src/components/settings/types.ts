// Klientens typer för Ajustes (WP-15b slim). Speglar `src/server/owner/ajustes.ts`,
// duplicerade i stället för importerade: en "use client"-fil importerar aldrig
// något under `@/server/*` (samma regel som src/components/onboarding/types.ts).
export type AjustesBusiness = {
  name: string;
  slug: string;
  comuna: string;
  phone: string;
  address: string;
  minNoticeMinutes: number;
  maxDaysAhead: number;
  cancelWindowHours: number;
  slotIntervalMinutes: number;
  /** WP-45 (D-033): av som standard, även för befintliga företag (Ägarens
   * svar 4). Av → reservas från `/{slug}` blir `requested`. */
  autoConfirmBookings: boolean;
  /** WP-56: `businesses.cancel_approval` — "none" (kunden avbokar direkt),
   * "late" (bara avbokningar senare än avbokningsfristen kräver godkännande)
   * eller "all" (varje avbokning kräver godkännande). */
  cancelApproval: "none" | "late" | "all";
  /** WP-54: `null` = förmånen för socios är avstängd. */
  memberDiscountPct: number | null;
  memberBenefitText: string | null;
  /** WP-31: `null` = "Te echamos de menos" automático är avstängd. */
  winbackDays: number | null;
  winbackMessage: string | null;
  winbackOfferPct: number | null;
  winbackOfferDays: number | null;
  /** WP-23: `businesses.waitlist_mode`. */
  waitlistMode: "sequential" | "broadcast";
  /** WP-23: `businesses.waitlist_hold_minutes` (5–240). */
  waitlistHoldMinutes: number;
  /** WP-65 (D-045): "Pedir reseña después de la cita". Saknas = på. */
  reviewRequestsEnabled?: boolean;
};

export type AjustesService = {
  id: string;
  name: string;
  durationMin: number;
  priceClp: number;
  /** WP-84 (D-069): precio "desde" (lägsta pris). */
  priceFrom: boolean;
  bufferAfterMin: number;
  active: boolean;
  /** WP-41: "" = sin descripción. */
  description: string;
};

export type AjustesStaffMember = {
  id: string;
  name: string;
  active: boolean;
  /** WP-41: rol, "" = sin rol (se guarda con `ProfileActions.updateStaffTitle`,
   * no con `updateStaff`: mismo split que en `src/server/owner/profile.ts`). */
  title: string;
  serviceIds: string[];
};

export type AjustesHour = {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  open: boolean;
  start: string;
  end: string;
};

/** WP-46: speglar `Perm`/`MemberView` (`src/server/db/permissions.ts`,
 * `src/server/owner/member.ts`) — duplicerade, samma motiv som ovan. */
export type AjustesPerm =
  | "can_manage_own_bookings"
  | "can_manage_all_bookings"
  | "can_cancel_bookings"
  | "can_edit_catalog"
  | "can_manage_team"
  | "can_view_reports"
  | "can_edit_settings";

export type AjustesMember = {
  role: "owner" | "staff" | "vendor" | "admin" | null;
  staffId: string | null;
  perms: Record<AjustesPerm, boolean>;
};

export type AjustesData = {
  /** WP-46: den inloggades roll och effektiva behörigheter — döljer
   * sektioner den inloggade inte får ändra. */
  member: AjustesMember;
  business: AjustesBusiness;
  services: AjustesService[];
  staff: AjustesStaffMember[];
  hours: AjustesHour[];
};

export type MutationResult = { ok: true } | { ok: false; code: string };
export type CreateResult =
  { ok: true; id: string } | { ok: false; code: string };

export type AjustesActions = {
  updateBusinessSettings: (input: unknown) => Promise<MutationResult>;
  createService: (input: unknown) => Promise<CreateResult>;
  updateService: (id: string, input: unknown) => Promise<MutationResult>;
  setServiceActive: (id: string, active: boolean) => Promise<MutationResult>;
  createStaff: (input: unknown) => Promise<CreateResult>;
  updateStaff: (id: string, input: unknown) => Promise<MutationResult>;
  setStaffActive: (id: string, active: boolean) => Promise<MutationResult>;
  updateHours: (input: unknown) => Promise<MutationResult>;
  /** WP-54: Ajustes → Socios (förmånen, av/på + rabatt + text). */
  updateMemberSettings: (input: unknown) => Promise<MutationResult>;
  /** WP-31: Ajustes → Socios y envíos ("Te echamos de menos" automático). */
  updateWinbackSettings: (input: unknown) => Promise<MutationResult>;
  /** WP-23: Ajustes → Reglas de reserva (lista de espera: modo + hålltid). */
  updateWaitlistSettings: (input: unknown) => Promise<MutationResult>;
};

// ---------------------------------------------------------------------------
// WP-46: Ajustes → Equipo (åtkomst till kontot). Speglar
// `src/server/team/members.ts`/`src/server/team/invitations.ts` — samma
// duplicerings-motiv som resten av filen.
// ---------------------------------------------------------------------------

export type TeamPermRecord = Record<AjustesPerm, boolean>;

export type TeamAccount =
  | { status: "none" }
  | {
      status: "pending";
      invitationId: string;
      email: string;
      sentAt: string;
      expiresAt: string;
    }
  | { status: "active"; userId: string; perms: TeamPermRecord };

export type TeamStaffMember = {
  staffId: string;
  name: string;
  active: boolean;
  account: TeamAccount;
};

export type TeamData = {
  staff: TeamStaffMember[];
  planLimitReached: boolean;
  /** UX-granskning (fel 4): se `src/server/team/members.ts`. */
  seatLimit: number;
  seatsUsed: number;
};

export type TeamInviteResult =
  { ok: true; invitationId: string } | { ok: false; code: string };
