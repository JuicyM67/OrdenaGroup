// /app/ajustes/compartir (WP-89, D-075): bokningslänken, QR-kod och guider för att lägga ut
// länken i Instagram, Google, WhatsApp Business, Facebook och TikTok. Inget laddas från
// databasen utöver företaget och inget sparas. Samma behörighet som Widgets
// (`can_edit_settings`, `ajustesTabVisible`).
import type { Metadata } from "next";

import { logout } from "@/app/auth/actions";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { CompartirSection } from "@/components/settings/compartir-section";
import { siteOrigin } from "@/config/site-url";
import { nav } from "@/i18n";

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

export default async function AjustesCompartirPage() {
  const ctx = await requireAjustesTab("compartir");
  const { business } = ctx.current;

  return (
    <AjustesShell
      active="compartir"
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
      {/* Adressen kommer från konfigurationen (NEXT_PUBLIC_APP_URL): vid domänbytet får
          länkarna och QR-koden den nya adressen utan kodändring. Redan utskrivna QR-koder
          och inklistrade länkar pekar på den gamla adressen. */}
      <CompartirSection
        slug={business.slug}
        businessName={business.name}
        bookingUrl={`${siteOrigin()}/${business.slug}`}
      />
    </AjustesShell>
  );
}
