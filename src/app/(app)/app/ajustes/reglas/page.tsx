// /app/ajustes/reglas (WP-55): anticipación mínima, ventana de cancelación, intervalo de
// horas y confirmación automática. Antes la otra mitad del mismo formulario que "Tu
// negocio" (`business-section.tsx`) — ahora `booking-rules-section.tsx`, mismo `action`
// (`updateBusinessSettingsAction`, escribe la fila entera de `businesses`).
import type { Metadata } from "next";

import { logout } from "@/app/auth/actions";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { BookingRulesSection } from "@/components/settings/booking-rules-section";
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

export default async function AjustesReglasPage() {
  const ctx = await requireAjustesTab("reglas");
  const business = await loadAjustesBusiness(
    ctx.userId,
    ctx.current.business.id,
  );

  return (
    <AjustesShell
      active="reglas"
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
      <BookingRulesSection
        business={business}
        action={updateBusinessSettingsAction}
      />
    </AjustesShell>
  );
}
