import "server-only";

/**
 * WP-46 steg 6 (ui-engineer): Ajustes → Equipo. Läsning av teamöversikten
 * (personal + kontostatus: inget konto / väntande inbjudan / aktivt konto
 * med behörigheter) och de två mutationerna ägaren saknade ("ändra flaggor",
 * "ta bort åtkomst" — personalraden finns kvar, bara `memberships`-raden
 * tas bort).
 *
 * `memberships` fick ALDRIG en egen RLS-uppdatering i WP-46 steg 2
 * (`20260930150100_permissions_rls.sql` rör inte den tabellen): policyerna
 * och kolumngrantet (`grant update (role, staff_id) on … to authenticated`)
 * är kvar som i 20260927100100, dvs `authenticated` kan INTE skriva de sju
 * behörighetsflaggorna. Samma lösning som `src/server/team/invitations.ts`
 * redan använder för den tabellen: `withServiceTx` + en egen `isOwner`-
 * kontroll i TypeScript (`src/server/privacy/authz.ts`), inte RLS. Ingen ny
 * migration behövs (D-034/Ägarens svar punkt 2: bara ägaren gör det här
 * ändå, så RLS hade behövt tillåta service-nivåskrivning eller en egen
 * security-definer-funktion — samma resultat, mindre yta med det befintliga
 * mönstret).
 */
import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";
import { isOwner } from "@/server/privacy/authz";

import { invitationFlagsSchema, type InvitationFlagsInput } from "./schemas";

export type MutationResult = { ok: true } | { ok: false; code: string };

export type TeamAccount =
  | { status: "none" }
  | {
      status: "pending";
      invitationId: string;
      email: string;
      sentAt: string;
      expiresAt: string;
    }
  | {
      status: "active";
      userId: string;
      perms: InvitationFlagsInput;
    };

export type TeamStaffMember = {
  staffId: string;
  name: string;
  active: boolean;
  account: TeamAccount;
};

export type TeamData = {
  staff: TeamStaffMember[];
  /** "Ägarens svar" 4: free/emprende (1 plats, redan ägarens egen) eller
   * platserna är fulla enligt `private.plan_staff_limit`/`staff_seat_count`
   * (samma hook som `member_invitations_guard_limit`/`accept_invitation`). */
  planLimitReached: boolean;
  /** UX-granskning (fel 4): planens kontogräns (1/1/3/10 för free/emprende/equipo/local)
   * och hur många som faktiskt används (ägaren inräknad, `private.staff_seat_count`) — så
   * UI:t kan säga "Din plan har N konton" i stället för att blanda ihop konton och
   * medarbetare i kalendern. */
  seatLimit: number;
  seatsUsed: number;
};

type StaffRow = { id: string; name: string; active: boolean };
type MembershipRow = {
  user_id: string;
  staff_id: string;
  can_manage_own_bookings: boolean;
  can_manage_all_bookings: boolean;
  can_cancel_bookings: boolean;
  can_edit_catalog: boolean;
  can_manage_team: boolean;
  can_view_reports: boolean;
  can_edit_settings: boolean;
};
type InvitationRow = {
  id: string;
  staff_id: string;
  email: string;
  created_at: string;
  expires_at: string;
};

function toPerms(r: MembershipRow): InvitationFlagsInput {
  return {
    can_manage_own_bookings: r.can_manage_own_bookings,
    can_manage_all_bookings: r.can_manage_all_bookings,
    can_cancel_bookings: r.can_cancel_bookings,
    can_edit_catalog: r.can_edit_catalog,
    can_manage_team: r.can_manage_team,
    can_view_reports: r.can_view_reports,
    can_edit_settings: r.can_edit_settings,
  };
}

/** `null` = anroparen är inte ägaren (anroparen visar inget, döljer sektionen). */
export async function loadTeamData(
  userId: string,
  businessId: string,
): Promise<TeamData | null> {
  return withServiceTx(async (q) => {
    if (!(await isOwner(q, userId, businessId))) return null;

    const staffRes = await q.query<StaffRow>(
      `select id, name, active from public.staff
        where business_id = $1
        order by sort, name`,
      [businessId],
    );
    const membershipsRes = await q.query<MembershipRow>(
      `select user_id, staff_id,
              can_manage_own_bookings, can_manage_all_bookings, can_cancel_bookings,
              can_edit_catalog, can_manage_team, can_view_reports, can_edit_settings
         from public.memberships
        where business_id = $1 and role = 'staff' and staff_id is not null`,
      [businessId],
    );
    const invitationsRes = await q.query<InvitationRow>(
      `select id, staff_id, email, created_at, expires_at
         from public.member_invitations
        where business_id = $1 and accepted_at is null and revoked_at is null
        order by created_at desc`,
      [businessId],
    );
    const limitRes = await q.query<{
      plan: "free" | "emprende" | "equipo" | "local";
      seat_limit: number | null;
      used: number;
    }>(
      `select b.plan,
              private.plan_staff_limit(b.plan) as seat_limit,
              private.staff_seat_count(b.id) as used
         from public.businesses b
        where b.id = $1`,
      [businessId],
    );

    const membershipByStaff = new Map(
      membershipsRes.rows.map((r) => [r.staff_id, r]),
    );
    const invitationByStaff = new Map(
      invitationsRes.rows.map((r) => [r.staff_id, r]),
    );

    const staff: TeamStaffMember[] = staffRes.rows.map((s) => {
      const membership = membershipByStaff.get(s.id);
      const invitation = invitationByStaff.get(s.id);
      const account: TeamAccount = membership
        ? {
            status: "active",
            userId: membership.user_id,
            perms: toPerms(membership),
          }
        : invitation
          ? {
              status: "pending",
              invitationId: invitation.id,
              email: invitation.email,
              sentAt: invitation.created_at,
              expiresAt: invitation.expires_at,
            }
          : { status: "none" };
      return { staffId: s.id, name: s.name, active: s.active, account };
    });

    const limitRow = limitRes.rows[0];
    const planLimitReached = limitRow
      ? limitRow.plan === "free" ||
        limitRow.plan === "emprende" ||
        (limitRow.seat_limit !== null && limitRow.used >= limitRow.seat_limit)
      : true;

    return {
      staff,
      planLimitReached,
      seatLimit: limitRow?.seat_limit ?? 1,
      seatsUsed: limitRow?.used ?? 1,
    };
  });
}

// ---------------------------------------------------------------------------
// Ändra en medlems behörigheter
// ---------------------------------------------------------------------------

async function assertMembershipMutable(
  q: Queryable,
  actingUserId: string,
  businessId: string,
): Promise<"ok" | "unauthorized"> {
  return (await isOwner(q, actingUserId, businessId)) ? "ok" : "unauthorized";
}

export async function updateMembershipPerms(
  actingUserId: string,
  businessId: string,
  targetUserId: string,
  rawPerms: unknown,
): Promise<MutationResult> {
  const parsed = invitationFlagsSchema.safeParse(rawPerms);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const perms = parsed.data;
  return withServiceTx(async (q) => {
    const check = await assertMembershipMutable(q, actingUserId, businessId);
    if (check !== "ok") return { ok: false, code: check };
    // `role = 'staff'`: ägarens egen rad (alltid alla behörigheter, `hasPerm`
    // kortsluter) redigeras aldrig härifrån.
    const r = await q.query(
      `update public.memberships
          set can_manage_own_bookings = $3, can_manage_all_bookings = $4,
              can_cancel_bookings = $5, can_edit_catalog = $6,
              can_manage_team = $7, can_view_reports = $8, can_edit_settings = $9
        where business_id = $1 and user_id = $2 and role = 'staff'`,
      [
        businessId,
        targetUserId,
        perms.can_manage_own_bookings,
        perms.can_manage_all_bookings,
        perms.can_cancel_bookings,
        perms.can_edit_catalog,
        perms.can_manage_team,
        perms.can_view_reports,
        perms.can_edit_settings,
      ],
    );
    return r.rowCount ? { ok: true } : { ok: false, code: "not_found" };
  });
}

// ---------------------------------------------------------------------------
// Ta bort åtkomst (personalraden finns kvar, bara memberships-raden tas bort)
// ---------------------------------------------------------------------------

export async function removeMembershipAccess(
  actingUserId: string,
  businessId: string,
  targetUserId: string,
): Promise<MutationResult> {
  return withServiceTx(async (q) => {
    const check = await assertMembershipMutable(q, actingUserId, businessId);
    if (check !== "ok") return { ok: false, code: check };
    const r = await q.query(
      `delete from public.memberships
        where business_id = $1 and user_id = $2 and role = 'staff'`,
      [businessId, targetUserId],
    );
    return r.rowCount ? { ok: true } : { ok: false, code: "not_found" };
  });
}
