// /app/ajustes/privacidad (WP-55, WP-26 steg 7, F12): exportar los datos del negocio y
// eliminar la cuenta con 30 días de arrepentimiento (`privacy-section.tsx`, sin cambios,
// solo se mueve a su propia ruta). Solo el dueño (`ajustesTabVisible`, `access.ts`).
import type { Metadata } from "next";

import { logout } from "@/app/auth/actions";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { PrivacySection } from "@/components/settings/privacy-section";
import { nav } from "@/i18n";

import { requireAjustesTab } from "../access";
import {
  approveCancelRequestAction,
  confirmRequestAction,
  declineCancelRequestAction,
  declineRequestAction,
} from "../actions";
import {
  cancelBusinessDeletionAction,
  exportBusinessAction,
  loadPrivacyStatusAction,
  requestBusinessDeletionAction,
} from "../privacy-actions";

export const metadata: Metadata = {
  title: nav.ajustes,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AjustesPrivacidadPage() {
  const ctx = await requireAjustesTab("privacidad");
  const privacyStatus = await loadPrivacyStatusAction();
  const deletionRequestedAt = privacyStatus.ok
    ? privacyStatus.deletionRequestedAt
    : null;

  return (
    <AjustesShell
      active="privacidad"
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
      <PrivacySection
        slug={ctx.current.business.slug}
        deletionRequestedAt={deletionRequestedAt}
        actions={{
          exportBusiness: exportBusinessAction,
          requestDeletion: requestBusinessDeletionAction,
          cancelDeletion: cancelBusinessDeletionAction,
        }}
      />
    </AjustesShell>
  );
}
