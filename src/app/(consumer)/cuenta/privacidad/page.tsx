// WP-67 (D-054): Integritet (CL `/cuenta/privacidad`, SE `/konto/integritet`):
// erbjudande-samtycket, export (JSON) och radering av kontot (Ley 21.719 /
// GDPR). Radering rör inte företagens kundregister (WP-26) — texten säger det.
import type { Metadata } from "next";

import { AccountShell } from "@/components/account/account-shell";
import { PrivacyPanel } from "@/components/account/privacy-panel";
import { cuenta } from "@/i18n";

import {
  deleteAccount,
  exportAccountData,
  saveMarketingConsent,
} from "../actions";
import { requireAccount } from "../session";

export const metadata: Metadata = {
  title: cuenta.meta.privacidad,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CuentaPrivacidadPage() {
  const session = await requireAccount();
  const t = cuenta.privacidad;
  return (
    <AccountShell active="perfil">
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-30 font-semibold tracking-title text-ink lg:text-36">
            {t.titulo}
          </h1>
          <p className="text-15 leading-body text-ink-soft">{t.texto}</p>
        </div>
        <PrivacyPanel
          marketingConsent={session.marketingConsent}
          onSaveMarketing={saveMarketingConsent}
          onExport={exportAccountData}
          onDelete={deleteAccount}
        />
      </div>
    </AccountShell>
  );
}
