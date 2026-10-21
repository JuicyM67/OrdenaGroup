// /app/ajustes/negocio (WP-55): nombre, link, comuna y datos de contacto. Antes la mitad
// de un solo formulario junto con "Reglas de reserva" (`business-section.tsx`, ahora
// separada en /app/ajustes/reglas) — mismo `action` (`updateBusinessSettingsAction`,
// escribe la fila entera de `businesses`).
import type { Metadata } from "next";

import { logout } from "@/app/auth/actions";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { BusinessSection } from "@/components/settings/business-section";
import { ImportSection } from "@/components/settings/import-section";
import { market } from "@/config/brand";
import { nav } from "@/i18n";
import { platformNamesFor } from "@/server/import/platforms";
import { isImportEnabled, isImportPaused } from "@/server/import/runs";
import { loadAjustesBusiness } from "@/server/owner/ajustes";

import { requireAjustesTab } from "../access";
import { applyImportAction } from "../import-actions";
import {
  approveCancelRequestAction,
  confirmRequestAction,
  declineCancelRequestAction,
  declineRequestAction,
  updateBusinessSettingsAction,
} from "../actions";

export const metadata: Metadata = {
  title: nav.ajustes,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AjustesNegocioPage() {
  const ctx = await requireAjustesTab("negocio");
  const business = await loadAjustesBusiness(
    ctx.userId,
    ctx.current.business.id,
  );
  // WP-66 (D-035): bara ägaren, och bara när importen finns och inte är pausad.
  const showImport =
    ctx.current.member.role === "owner" &&
    isImportEnabled() &&
    !(await isImportPaused());

  return (
    <AjustesShell
      active="negocio"
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
      <div className="flex flex-col gap-6">
        {showImport ? (
          <ImportSection
            platformNames={platformNamesFor(market)}
            action={applyImportAction}
          />
        ) : null}
        <BusinessSection
          business={business}
          action={updateBusinessSettingsAction}
        />
      </div>
    </AjustesShell>
  );
}
