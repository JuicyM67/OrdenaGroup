// /app/ajustes/horario (WP-55): un intervalo por día (`hours-section.tsx`, sin cambios,
// solo se mueve a su propia ruta).
import type { Metadata } from "next";

import { logout } from "@/app/auth/actions";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { HoursSection } from "@/components/settings/hours-section";
import { nav } from "@/i18n";
import { loadAjustesHours } from "@/server/owner/ajustes";

import { requireAjustesTab } from "../access";
import {
  approveCancelRequestAction,
  confirmRequestAction,
  declineCancelRequestAction,
  declineRequestAction,
  updateHoursAction,
} from "../actions";

export const metadata: Metadata = {
  title: nav.ajustes,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AjustesHorarioPage() {
  const ctx = await requireAjustesTab("horario");
  const hours = await loadAjustesHours(ctx.userId, ctx.current.business.id);

  return (
    <AjustesShell
      active="horario"
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
      <HoursSection hours={hours} action={updateHoursAction} />
    </AjustesShell>
  );
}
