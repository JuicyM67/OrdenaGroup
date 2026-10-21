// /app/ajustes/plan, WP-73 (D-048): aktuell plan, användning denna månad och
// vad planen innehåller. Bara ägaren (`ajustesTabVisible`).
import type { Metadata } from "next";

import { logout } from "@/app/auth/actions";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { PlanSection } from "@/components/settings/plan-section";
import { nav } from "@/i18n";
import { loadPlanUsage } from "@/server/plans/entitlements";

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

export default async function AjustesPlanPage() {
  const ctx = await requireAjustesTab("plan");
  const usage = await loadPlanUsage(ctx.current.business.id);

  return (
    <AjustesShell
      active="plan"
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
      <PlanSection
        data={{
          plan: usage.plan,
          billingMode: usage.billingMode,
          staff: usage.staff,
          services: usage.services,
        }}
      />
    </AjustesShell>
  );
}
