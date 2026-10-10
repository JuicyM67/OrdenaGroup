// /app/ajustes/reglas (WP-55): anticipación mínima, ventana de cancelación, intervalo de
// horas y confirmación automática. Antes la otra mitad del mismo formulario que "Tu
// negocio" (`business-section.tsx`) — ahora `booking-rules-section.tsx`, mismo `action`
// (`updateBusinessSettingsAction`, escribe la fila entera de `businesses`).
import type { Metadata } from "next";

import { logout } from "@/app/auth/actions";
import { UpgradeNotice } from "@/components/plans/upgrade-notice";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { BookingRulesSection } from "@/components/settings/booking-rules-section";
import { nav } from "@/i18n";
import { loadAjustesBusiness } from "@/server/owner/ajustes";

import { planCan } from "@/server/plans/entitlements";

import { requireAjustesTab } from "../access";
import {
  approveCancelRequestAction,
  confirmRequestAction,
  declineCancelRequestAction,
  declineRequestAction,
  updateBusinessSettingsAction,
  updateReviewRequestsAction,
  updateWaitlistSettingsAction,
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
      notices={ctx.notices}
      onConfirmRequest={confirmRequestAction}
      onDeclineRequest={declineRequestAction}
      onApproveCancelRequest={approveCancelRequestAction}
      onDeclineCancelRequest={declineCancelRequestAction}
      myProfile={ctx.myProfile ?? undefined}
      myProfileActions={ctx.myProfileActions}
    >
      {planCan(ctx.plan, "waitlist") ? null : (
        <UpgradeNotice feature="waitlist" linkHref={ctx.plansHref} />
      )}
      <BookingRulesSection
        business={business}
        action={updateBusinessSettingsAction}
        waitlistAction={
          ctx.current.view.perms.can_edit_settings
            ? updateWaitlistSettingsAction
            : undefined
        }
        reviewRequestsAction={
          ctx.current.view.perms.can_edit_settings
            ? updateReviewRequestsAction
            : undefined
        }
      />
    </AjustesShell>
  );
}
