"use server";

// Server actions för Ajustes → Equipo (WP-46 steg 6): bjuda in, skicka igen,
// återkalla, ändra behörigheter, ta bort åtkomst. Samma mönster som
// `./actions.ts`: `userId`/`businessId` läses ur den verifierade sessionen
// här, aldrig från klienten. Bara ägaren kan göra något av det här ("Ägarens
// svar" punkt 2) — `createInvitation`/`updateMembershipPerms`/
// `removeMembershipAccess` gör samma kontroll själva, det här lagret bara
// vidarebefordrar och kickar utkorgen efter en lyckad inbjudan/omsändning.
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { kickOutbox } from "@/server/messaging/outbox";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import {
  createInvitation,
  resendInvitation,
  revokeInvitation,
  type CreateInvitationResult,
  type MutationResult as InvitationMutationResult,
} from "@/server/team/invitations";
import {
  loadTeamData,
  removeMembershipAccess,
  updateMembershipPerms,
  type MutationResult,
  type TeamData,
} from "@/server/team/members";
import { ownerNameParts } from "@/server/owner/shared";

async function currentOwner(): Promise<
  | { userId: string; businessId: string; ownerName: string }
  | { ok: false; code: "unauthorized" }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "unauthorized" };
  const current = await getCurrentMember(user.id);
  if (!current) return { ok: false, code: "unauthorized" };
  return {
    userId: user.id,
    businessId: current.business.id,
    ownerName: ownerNameParts(user.email).name,
  };
}

export async function loadTeamDataAction(): Promise<
  { ok: true; data: TeamData } | { ok: false; code: string }
> {
  const ctx = await currentOwner();
  if ("ok" in ctx) return ctx;
  const data = await loadTeamData(ctx.userId, ctx.businessId);
  if (!data) return { ok: false, code: "unauthorized" };
  return { ok: true, data };
}

export async function inviteStaffAction(input: {
  email: string;
  staffId: string;
  flags: {
    can_manage_own_bookings: boolean;
    can_manage_all_bookings: boolean;
    can_cancel_bookings: boolean;
    can_edit_catalog: boolean;
    can_manage_team: boolean;
    can_view_reports: boolean;
    can_edit_settings: boolean;
  };
}): Promise<CreateInvitationResult> {
  const ctx = await currentOwner();
  if ("ok" in ctx) return ctx;
  const result = await createInvitation({
    businessId: ctx.businessId,
    invitedBy: ctx.userId,
    invitedByName: ctx.ownerName,
    email: input.email,
    staffId: input.staffId,
    flags: input.flags,
  });
  if (result.ok) void kickOutbox();
  return result;
}

export async function resendInvitationAction(
  invitationId: string,
): Promise<InvitationMutationResult> {
  const ctx = await currentOwner();
  if ("ok" in ctx) return ctx;
  const result = await resendInvitation({
    businessId: ctx.businessId,
    invitationId,
    userId: ctx.userId,
    invitedByName: ctx.ownerName,
  });
  if (result.ok) void kickOutbox();
  return result;
}

export async function revokeInvitationAction(
  invitationId: string,
): Promise<InvitationMutationResult> {
  const ctx = await currentOwner();
  if ("ok" in ctx) return ctx;
  return revokeInvitation({
    businessId: ctx.businessId,
    invitationId,
    userId: ctx.userId,
  });
}

export async function updateMemberPermsAction(
  targetUserId: string,
  perms: unknown,
): Promise<MutationResult> {
  const ctx = await currentOwner();
  if ("ok" in ctx) return ctx;
  return updateMembershipPerms(ctx.userId, ctx.businessId, targetUserId, perms);
}

export async function removeMemberAccessAction(
  targetUserId: string,
): Promise<MutationResult> {
  const ctx = await currentOwner();
  if ("ok" in ctx) return ctx;
  return removeMembershipAccess(ctx.userId, ctx.businessId, targetUserId);
}
