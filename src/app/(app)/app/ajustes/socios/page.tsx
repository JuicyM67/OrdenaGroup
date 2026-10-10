// /app/ajustes/socios (WP-55, WP-54): el beneficio para clientes marcados como
// `customers.is_member`. Ya vivía en su propia sección (`member-section.tsx`, su propio
// `action`, `updateMemberSettingsAction`) — solo se mueve a su propia ruta.
import type { Metadata } from "next";

import { logout } from "@/app/auth/actions";
import { UpgradeNotice } from "@/components/plans/upgrade-notice";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { MemberSection } from "@/components/settings/member-section";
import { WinbackSection } from "@/components/settings/winback-section";
import { nav } from "@/i18n";
import { loadAjustesBusiness } from "@/server/owner/ajustes";

import { planCan } from "@/server/plans/entitlements";

import { requireAjustesTab } from "../access";
import {
  approveCancelRequestAction,
  confirmRequestAction,
  declineCancelRequestAction,
  declineRequestAction,
  updateMemberSettingsAction,
  updateWinbackSettingsAction,
} from "../actions";

export const metadata: Metadata = {
  title: nav.ajustes,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AjustesSociosPage() {
  const ctx = await requireAjustesTab("socios");
  const business = await loadAjustesBusiness(
    ctx.userId,
    ctx.current.business.id,
  );

  return (
    <AjustesShell
      active="socios"
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
      {planCan(ctx.plan, "campaigns") ? null : (
        <UpgradeNotice feature="campaigns" linkHref={ctx.plansHref} />
      )}
      <MemberSection business={business} action={updateMemberSettingsAction} />
      <WinbackSection
        business={business}
        action={updateWinbackSettingsAction}
      />
    </AjustesShell>
  );
}
