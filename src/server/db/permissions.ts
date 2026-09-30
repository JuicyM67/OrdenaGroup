import "server-only";

import type { Queryable } from "@/server/db/pool";

/**
 * WP-46 steg 3 (db-engineer): TypeScript-spegeln av `private.has_perm`/
 * `private.member_staff_id` (supabase/migrations/20260930150000_…). Behövs
 * eftersom varje mutation i `src/server/` som kör `runAs`/`withServiceTx`
 * (kundens/väntelistans/cronens flöden) gör det som `service_role` — RLS
 * gäller inte då, så servern måste göra SAMMA kontroll själv, precis som
 * `public.create_business()`/`isOwnerOrAdmin` redan gör (se
 * `src/server/privacy/authz.ts`).
 *
 * VIKTIGT (uppdraget WP-46, "byt inte ännu anropsställena"): den här filen
 * lägger bara grunden. `isOwnerOrAdmin`/`isOwner` i `src/server/privacy/
 * authz.ts` och alla `bookings/`-flöden (cancel.ts, confirm.ts, manage.ts …)
 * fortsätter oförändrade i den här omgången — de byts mot `loadMember`/
 * `requirePerm` i nästa steg (se rapporten till uppdragsgivaren).
 */

/** Samma sju flaggor som `memberships`/`member_invitations`-kolumnerna. */
export type Perm =
  | "can_manage_own_bookings"
  | "can_manage_all_bookings"
  | "can_cancel_bookings"
  | "can_edit_catalog"
  | "can_manage_team"
  | "can_view_reports"
  | "can_edit_settings";

export const PERMS: readonly Perm[] = [
  "can_manage_own_bookings",
  "can_manage_all_bookings",
  "can_cancel_bookings",
  "can_edit_catalog",
  "can_manage_team",
  "can_view_reports",
  "can_edit_settings",
];

/** Samma fyra värden som `public.member_role` (D-034: `admin` är en
 * reserverad PLATTFORMSROLL, se DATA_MODEL.md "Roller" — får aldrig
 * behörigheter via `hasPerm`, bara `owner` kortsluter). */
export type MemberRole = "owner" | "staff" | "vendor" | "admin";

export type Member = {
  userId: string;
  businessId: string;
  role: MemberRole;
  staffId: string | null;
  perms: Record<Perm, boolean>;
};

type MembershipRow = {
  role: MemberRole;
  staff_id: string | null;
  can_manage_own_bookings: boolean;
  can_manage_all_bookings: boolean;
  can_cancel_bookings: boolean;
  can_edit_catalog: boolean;
  can_manage_team: boolean;
  can_view_reports: boolean;
  can_edit_settings: boolean;
};

/**
 * Läser den inloggades medlemskap i ett företag. `null` om personen inte är
 * medlem (samma som `private.is_member` returnerar `false` i RLS).
 */
export async function loadMember(
  q: Queryable,
  userId: string,
  businessId: string,
): Promise<Member | null> {
  const r = await q.query<MembershipRow>(
    `select role, staff_id,
            can_manage_own_bookings, can_manage_all_bookings, can_cancel_bookings,
            can_edit_catalog, can_manage_team, can_view_reports, can_edit_settings
       from public.memberships
      where business_id = $1 and user_id = $2`,
    [businessId, userId],
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    userId,
    businessId,
    role: row.role,
    staffId: row.staff_id,
    perms: {
      can_manage_own_bookings: row.can_manage_own_bookings,
      can_manage_all_bookings: row.can_manage_all_bookings,
      can_cancel_bookings: row.can_cancel_bookings,
      can_edit_catalog: row.can_edit_catalog,
      can_manage_team: row.can_manage_team,
      can_view_reports: row.can_view_reports,
      can_edit_settings: row.can_edit_settings,
    },
  };
}

/**
 * Samma regel som `private.has_perm` + `staff_id`-jämförelsen i
 * `bookings`-policyerna (20260930150100_permissions_rls.sql):
 * - `owner` har alltid allt, oavsett flaggor.
 * - `vendor`/`admin` får aldrig `true` här (WP-35/F19, utanför scope).
 * - `staff` behöver den efterfrågade flaggan satt.
 * - `opts.staffId`, om satt, kräver ATT DESSUTOM `member.staffId` matchar
 *   (används av `can_manage_own_bookings`: "min egen bokning", `bookings.
 *   staff_id = private.member_staff_id(business_id)` i SQL).
 */
export function hasPerm(
  member: Member | null,
  perm: Perm,
  opts: { staffId?: string | null } = {},
): boolean {
  if (!member) return false;
  if (member.role === "owner") return true;
  if (member.role !== "staff") return false;
  if (!member.perms[perm]) return false;
  if (opts.staffId !== undefined) {
    return member.staffId !== null && member.staffId === opts.staffId;
  }
  return true;
}

/** Kastas av `requirePerm`. Mappas av anropsstället till t.ex. `err("forbidden")`. */
export class PermissionDeniedError extends Error {
  readonly perm: Perm;

  constructor(perm: Perm) {
    super(`permission denied: ${perm}`);
    this.name = "PermissionDeniedError";
    this.perm = perm;
  }
}

/**
 * Assert-variant av `hasPerm`: kastar `PermissionDeniedError` i stället för
 * att returnera `false`. `boundaries.test.ts` (WP-46 nästa steg) kommer att
 * kräva att varje mutation i `src/server/` anropar antingen den här eller
 * `isOwner` (kontoexport/radering, oförändrat).
 */
export function requirePerm(
  member: Member | null,
  perm: Perm,
  opts: { staffId?: string | null } = {},
): void {
  if (!hasPerm(member, perm, opts)) {
    throw new PermissionDeniedError(perm);
  }
}
