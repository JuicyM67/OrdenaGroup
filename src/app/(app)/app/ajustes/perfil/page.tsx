// /app/ajustes/perfil (WP-55): lo que ve el cliente en `/{slug}` — sobre nosotros, redes,
// portada/logo y galería (`profile-section.tsx`, sin cambios, solo se mueve a su propia
// ruta). Enlazada desde `UserMenu` ("Perfil", cuando la cuenta no tiene su propia fila de
// personal) y desde el "+ Agregar profesional" de la agenda — ver `ajustes-tabs.tsx`.
import type { Metadata } from "next";

import { logout } from "@/app/auth/actions";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { ProfileSection } from "@/components/settings/profile-section";
import { nav } from "@/i18n";
import { loadProfileSettings } from "@/server/owner/profile";

import { requireAjustesTab } from "../access";
import {
  approveCancelRequestAction,
  confirmRequestAction,
  declineCancelRequestAction,
  declineRequestAction,
} from "../actions";
import {
  confirmImageUploadAction,
  createImageUploadAction,
  deleteImageAction,
  reorderImagesAction,
  updateBusinessProfileAction,
  updateStaffTitleAction,
} from "../profile-actions";

export const metadata: Metadata = {
  title: nav.ajustes,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AjustesPerfilPage() {
  const ctx = await requireAjustesTab("perfil");
  const profile = await loadProfileSettings(
    ctx.userId,
    ctx.current.business.id,
  );

  return (
    <AjustesShell
      active="perfil"
      tabs={ctx.tabs}
      business={ctx.current.business}
      owner={ctx.owner}
      onLogout={logout}
      canViewReports={ctx.current.view.perms.can_view_reports}
      pendingRequests={ctx.pendingRequests}
      notices={ctx.notices}
      onConfirmRequest={confirmRequestAction}
      onDeclineRequest={declineRequestAction}
      onApproveCancelRequest={approveCancelRequestAction}
      onDeclineCancelRequest={declineCancelRequestAction}
      myProfile={ctx.myProfile ?? undefined}
      myProfileActions={ctx.myProfileActions}
    >
      <ProfileSection
        data={profile}
        actions={{
          updateBusinessProfile: updateBusinessProfileAction,
          updateStaffTitle: updateStaffTitleAction,
          createImageUpload: createImageUploadAction,
          confirmImageUpload: confirmImageUploadAction,
          deleteImage: deleteImageAction,
          reorderImages: reorderImagesAction,
        }}
      />
    </AjustesShell>
  );
}
