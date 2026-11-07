// /app/ajustes/widgets (WP-82, D-067): widgets för företagets egen hemsida (reseñas, knapp,
// inbäddad bokning). Inget laddas från databasen och inget sparas: valen finns i sidan och i
// koden ägaren kopierar. Fliken kräver `can_edit_settings` (`ajustesTabVisible`).
import type { Metadata } from "next";

import { logout } from "@/app/auth/actions";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { WidgetsSection } from "@/components/settings/widgets-section";
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

export default async function AjustesWidgetsPage() {
  const ctx = await requireAjustesTab("widgets");

  return (
    <AjustesShell
      active="widgets"
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
      {/* Adressen i `<script src>` kommer från konfigurationen (NEXT_PUBLIC_APP_URL), så
          ett domänbyte kräver ingen kodändring (nya koder får den nya adressen). */}
      <WidgetsSection slug={ctx.current.business.slug} origin={siteOrigin()} />
    </AjustesShell>
  );
}
