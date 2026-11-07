// /app/ajustes/negocio (WP-55): nombre, link, comuna y datos de contacto. Antes la mitad
// de un solo formulario junto con "Reglas de reserva" (`business-section.tsx`, ahora
// separada en /app/ajustes/reglas) — mismo `action` (`updateBusinessSettingsAction`,
// escribe la fila entera de `businesses`).
import type { Metadata } from "next";

import { logout } from "@/app/auth/actions";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { BusinessSection } from "@/components/settings/business-section";
import { ImportSection } from "@/components/settings/import-section";
import { DescubreSection } from "@/components/settings/descubre-section";
import { marketplaceEnabled } from "@/config/marketplace";
import { nav } from "@/i18n";
import { platformNames } from "@/server/import/platforms";
import { isImportEnabled, isImportPaused } from "@/server/import/runs";
import { loadAjustesBusiness } from "@/server/owner/ajustes";
import { loadPlanUsage } from "@/server/plans/entitlements";
import { loadDescubreSettings } from "@/server/owner/descubre";

import { requireAjustesTab } from "../access";
import { applyImportAction } from "../import-actions";
import {
  approveCancelRequestAction,
  confirmRequestAction,
  declineCancelRequestAction,
  declineRequestAction,
  updateBusinessSettingsAction,
  updateDescubreSettingsAction,
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
  // WP-85 (D-070): "Descubre" under företagsuppgifterna (av när marknadsplatsen är av).
  const descubreSettings = marketplaceEnabled()
    ? await loadDescubreSettings(ctx.userId, ctx.current.business.id)
    : null;
  const showImport =
    ctx.current.member.role === "owner" &&
    isImportEnabled() &&
    !(await isImportPaused());
  // WP-84 (D-069): plan och antal för importens "plan sugerido".
  const usage = showImport
    ? await loadPlanUsage(ctx.current.business.id).catch(() => null)
    : null;

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
            platformNames={platformNames()}
            action={applyImportAction}
            currentPlan={usage?.plan}
            existingCounts={
              usage
                ? { services: usage.services.used, staff: usage.staff.used }
                : undefined
            }
          />
        ) : null}
        <BusinessSection
          business={business}
          action={updateBusinessSettingsAction}
        />
        {descubreSettings ? (
          <DescubreSection
            settings={descubreSettings}
            action={updateDescubreSettingsAction}
          />
        ) : null}
      </div>
    </AjustesShell>
  );
}
