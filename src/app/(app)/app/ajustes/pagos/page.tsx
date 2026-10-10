// /app/ajustes/pagos (WP-64, D-044): Stripe Connect — bara SE och bara när
// Stripe är konfigurerat (`requireAjustesTab` omdirigerar annars).
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { logout } from "@/app/auth/actions";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { PaymentsSection } from "@/components/settings/payments-section";
import { appHref } from "@/config/routes";
import { nav } from "@/i18n";
import { loadPaymentSettings } from "@/server/payments/stripe/settings";

import { requireAjustesTab } from "../access";
import {
  approveCancelRequestAction,
  confirmRequestAction,
  declineCancelRequestAction,
  declineRequestAction,
} from "../actions";
import {
  openStripeDashboardAction,
  startStripeOnboardingAction,
  updateOnlinePaymentModeAction,
} from "../pagos-actions";

export const metadata: Metadata = {
  title: nav.ajustes,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AjustesPagosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireAjustesTab("pagos");
  const sp = await searchParams;
  // Tillbaka från Stripe: läs kontots status direkt (webhooken kan vara en stund efter).
  const refresh = sp.stripe === "return" || sp.stripe === "refresh";
  const loaded = await loadPaymentSettings(
    ctx.userId,
    ctx.current.business.id,
    {
      refresh,
    },
  );
  if (!loaded.ok) redirect(appHref("appAgenda"));
  const { state, mode, feeBps } = loaded.settings;
  // `unavailable` kan inte nås här (fliken är dold utan nycklar), men typen kräver ett val.
  const status = state.status === "unavailable" ? "none" : state.status;

  return (
    <AjustesShell
      active="pagos"
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
      <PaymentsSection
        status={status}
        canCharge={state.canCharge}
        mode={mode}
        feeBps={feeBps}
        onStart={startStripeOnboardingAction}
        onOpenDashboard={openStripeDashboardAction}
        onSaveMode={updateOnlinePaymentModeAction}
      />
    </AjustesShell>
  );
}
