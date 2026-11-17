// /app/ajustes/qr (WP-95, D-079): skyltar med QR att skriva ut — bokningsskylten och
// mini-skylten "Crea tu cuenta". Samma behörighet som "Comparte tu link"
// (`can_edit_settings`, `ajustesTabVisible`), alla planer. Inget sparas.
import type { Metadata } from "next";

import { logout } from "@/app/auth/actions";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { CartelesSection } from "@/components/settings/carteles-section";
import { siteOrigin } from "@/config/site-url";
import { nav } from "@/i18n";
import { loadCartelBusiness } from "@/server/owner/carteles";

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

export default async function AjustesQrPage() {
  const ctx = await requireAjustesTab("qr");
  const { business } = ctx.current;
  const cartelBusiness = await loadCartelBusiness(ctx.userId, business.id);

  return (
    <AjustesShell
      active="qr"
      tabs={ctx.tabs}
      business={business}
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
      {/* Adressen kommer från konfigurationen (NEXT_PUBLIC_APP_URL), som i "Comparte tu
          link": redan utskrivna skyltar pekar på adressen som gällde vid utskriften. */}
      <CartelesSection
        slug={business.slug}
        business={cartelBusiness}
        origin={siteOrigin()}
      />
    </AjustesShell>
  );
}
