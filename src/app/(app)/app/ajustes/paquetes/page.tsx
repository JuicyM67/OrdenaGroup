// /app/ajustes/paquetes (WP-86, D-072): paketmallar ("10 sesiones de
// kinesiología"). Fliken kräver `can_edit_catalog` (`ajustesTabVisible`);
// att skapa och ändra kräver planfunktionen `packages` (uppgraderingsrutan
// annars). Servern kontrollerar båda igen i `savePackageTemplate`.
import type { Metadata } from "next";

import { logout } from "@/app/auth/actions";
import { PackageTemplatesSection } from "@/components/packages/package-templates-section";
import { UpgradeNotice } from "@/components/plans/upgrade-notice";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { nav } from "@/i18n";
import { loadPackageTemplates } from "@/server/packages/packages";

import { savePackageTemplateAction } from "../../caja/package-actions";
import { requireAjustesTab } from "../access";
import {
  approveCancelRequestAction,
  confirmRequestAction,
  declineCancelRequestAction,
  declineRequestAction,
} from "../actions";

export const metadata: Metadata = {
  title: nav.ajustes,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AjustesPaquetesPage() {
  const ctx = await requireAjustesTab("paquetes");
  const data = await loadPackageTemplates(ctx.userId, ctx.current.business.id);

  return (
    <AjustesShell
      active="paquetes"
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
      {data.planAllows ? null : (
        <UpgradeNotice
          feature="packages"
          linkHref={ctx.plansHref}
          manualBilling={ctx.plan.billingMode === "manual"}
        />
      )}
      <PackageTemplatesSection
        templates={data.templates}
        services={data.services}
        editable={data.planAllows && data.canEdit}
        onSave={savePackageTemplateAction}
      />
    </AjustesShell>
  );
}
