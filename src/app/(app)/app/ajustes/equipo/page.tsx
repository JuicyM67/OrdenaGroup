// /app/ajustes/equipo (WP-55, ägarens feedback 2026-09-30: "Vad hände med inställningar
// för personal och personalkonto? Jag vill ha en egen flik för att hantera teamet.") —
// todo lo relacionado al equipo en un solo lugar.
//
// UX-granskning (2026-10-01): `StaffSection`/`TeamSection` (listas separadas, personal y
// cuentas) se fusionaron en una sola `TeamSection` — una fila por persona, ver el
// comentario de archivo en `team-section.tsx`. `team`/`teamActions` solo para el dueño
// (`isOwner`), igual que antes.
import type { Metadata } from "next";

import { logout } from "@/app/auth/actions";
import { UpgradeNotice } from "@/components/plans/upgrade-notice";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { TeamSection } from "@/components/settings/team-section";
import { nav } from "@/i18n";
import { loadAjustesServices, loadAjustesStaff } from "@/server/owner/ajustes";
import { loadProfileSettings } from "@/server/owner/profile";
import { loadTeamData } from "@/server/team/members";

import { planCan } from "@/server/plans/entitlements";

import { requireAjustesTab } from "../access";
import {
  approveCancelRequestAction,
  confirmRequestAction,
  createStaffAction,
  declineCancelRequestAction,
  declineRequestAction,
  setStaffActiveAction,
  updateStaffAction,
} from "../actions";
import {
  confirmImageUploadAction,
  createImageUploadAction,
  deleteImageAction,
  updateStaffTitleAction,
} from "../profile-actions";
import {
  inviteStaffAction,
  loadTeamDataAction,
  removeMemberAccessAction,
  resendInvitationAction,
  revokeInvitationAction,
  updateMemberPermsAction,
} from "../team-actions";

export const metadata: Metadata = {
  title: nav.ajustes,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function onReloadTeam() {
  "use server";
  const result = await loadTeamDataAction();
  return result.ok ? result.data : null;
}

export default async function AjustesEquipoPage() {
  const ctx = await requireAjustesTab("equipo");
  const isOwner = ctx.current.view.role === "owner";
  const businessId = ctx.current.business.id;

  const [staff, services, profile, team] = await Promise.all([
    loadAjustesStaff(ctx.userId, businessId),
    loadAjustesServices(ctx.userId, businessId),
    loadProfileSettings(ctx.userId, businessId),
    isOwner ? loadTeamData(ctx.userId, businessId) : Promise.resolve(null),
  ]);

  return (
    <AjustesShell
      active="equipo"
      tabs={ctx.tabs}
      business={ctx.current.business}
      owner={ctx.owner}
      onLogout={logout}
      canViewReports={ctx.current.view.perms.can_view_reports}
      pendingRequests={ctx.pendingRequests}
      onConfirmRequest={confirmRequestAction}
      onDeclineRequest={declineRequestAction}
      onApproveCancelRequest={approveCancelRequestAction}
      onDeclineCancelRequest={declineCancelRequestAction}
      myProfile={ctx.myProfile ?? undefined}
      myProfileActions={ctx.myProfileActions}
    >
      {planCan(ctx.plan, "staff_accounts") ? null : (
        <UpgradeNotice feature="staff_accounts" linkHref={ctx.plansHref} />
      )}
      <TeamSection
        staff={staff}
        services={services}
        photos={profile.staffPhotos}
        staffActions={{
          create: createStaffAction,
          update: updateStaffAction,
          setActive: setStaffActiveAction,
          updateTitle: updateStaffTitleAction,
          createImageUpload: createImageUploadAction,
          confirmImageUpload: confirmImageUploadAction,
          deleteImage: deleteImageAction,
        }}
        team={isOwner ? (team ?? null) : null}
        teamActions={
          isOwner
            ? {
                onInvite: inviteStaffAction,
                onResend: resendInvitationAction,
                onRevoke: revokeInvitationAction,
                onUpdatePerms: updateMemberPermsAction,
                onRemoveAccess: removeMemberAccessAction,
              }
            : undefined
        }
        onReloadTeam={isOwner ? onReloadTeam : undefined}
      />
    </AjustesShell>
  );
}
