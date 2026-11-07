// /app/ajustes/ficha (WP-88, D-074): datos fijos de la ficha y consentimientos
// informados con sus servicios. `can_edit_settings` (ajustesTabVisible) y el plan
// Emprende o superior para escribir (`src/server/records/settings.ts` lo vuelve a
// controlar, RLS también).
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { logout } from "@/app/auth/actions";
import { UpgradeNotice } from "@/components/plans/upgrade-notice";
import { FichaSettingsSection } from "@/components/records/ficha-settings-section";
import type { RecordSettingsActions } from "@/components/records/types";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { appHref } from "@/config/routes";
import { nav } from "@/i18n";
import { planCan } from "@/server/plans/entitlements";
import {
  loadRecordSettings,
  saveConsentTemplate,
  saveRecordFieldSettings,
} from "@/server/records/settings";

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

export default async function AjustesFichaPage() {
  const ctx = await requireAjustesTab("ficha");
  const businessId = ctx.current.business.id;
  const userId = ctx.userId;
  const data = await loadRecordSettings(userId, businessId);
  if (!data) redirect(appHref("appAgenda"));
  const locked = !planCan(ctx.plan, "records");

  const actions: RecordSettingsActions = {
    saveFields: async (fields) => {
      "use server";
      return saveRecordFieldSettings(userId, businessId, fields);
    },
    saveTemplate: async (input) => {
      "use server";
      return saveConsentTemplate(userId, businessId, input);
    },
  };

  return (
    <AjustesShell
      active="ficha"
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
      {locked ? (
        <UpgradeNotice
          feature="records"
          linkHref={ctx.plansHref}
          manualBilling={ctx.plan.billingMode === "manual"}
        />
      ) : null}
      <FichaSettingsSection data={data} actions={actions} locked={locked} />
    </AjustesShell>
  );
}
