// /app/ajustes/negocio (WP-55): nombre, link, comuna y datos de contacto. Antes la mitad
// de un solo formulario junto con "Reglas de reserva" (`business-section.tsx`, ahora
// separada en /app/ajustes/reglas) — mismo `action` (`updateBusinessSettingsAction`,
// escribe la fila entera de `businesses`).
import type { Metadata } from "next";

import { logout } from "@/app/auth/actions";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { AjustesTabRefresh } from "@/components/settings/ajustes-tab-refresh";
import { BusinessSection } from "@/components/settings/business-section";
import { nav } from "@/i18n";
import { loadAjustesBusiness } from "@/server/owner/ajustes";

import { requireAjustesTab } from "../access";
import {
  confirmRequestAction,
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
      myProfile={ctx.myProfile ?? undefined}
      myProfileActions={ctx.myProfileActions}
    >
      <AjustesTabRefresh>
        {(refresh) => (
          <BusinessSection
            business={business}
            onSaved={refresh}
            action={updateBusinessSettingsAction}
          />
        )}
      </AjustesTabRefresh>
    </AjustesShell>
  );
}
