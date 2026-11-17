// /app/ajustes/qr (WP-95/96, D-079/D-080): skylteditorn — bokningsskylten och
// mini-skylten "Crea tu cuenta", med sparad design per företag. Samma behörighet som "Comparte tu link"
// (`can_edit_settings`, `ajustesTabVisible`), alla planer.
import type { Metadata } from "next";

import { logout } from "@/app/auth/actions";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { CartelesSection } from "@/components/settings/carteles-section";
import { siteOrigin } from "@/config/site-url";
import { nav } from "@/i18n";
import { loadCartelData } from "@/server/owner/carteles";

import { requireAjustesTab } from "../access";
import {
  approveCancelRequestAction,
  confirmRequestAction,
  declineCancelRequestAction,
  declineRequestAction,
} from "../actions";

import { saveSignDesignAction } from "./actions";

export const metadata: Metadata = {
  title: nav.ajustes,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AjustesQrPage() {
  const ctx = await requireAjustesTab("qr");
  const { business } = ctx.current;
  const data = await loadCartelData(ctx.userId, business.id);

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
        business={data.business}
        origin={siteOrigin()}
        designs={data.designs}
        onSave={saveSignDesignAction}
      />
    </AjustesShell>
  );
}
