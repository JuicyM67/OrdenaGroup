// /admin/mfa (F19/WP-36, D-038): inskrivning (QR) eller verifiering av
// TOTP-kod, beroende på om personen redan har en verifierad faktor. Kräver
// bara att personen finns i `platform_admins` (inte `aal2` — det är hela
// poängen med sidan). Redan `aal2` → skickas vidare av `MfaPanel` själv
// (klient-side, samma koll som här hade gett server-side).
import type { Metadata } from "next";

import { MfaPanel } from "@/components/admin/mfa-panel";
import { requireAdminAnyAal } from "@/server/admin/auth";

export const metadata: Metadata = {
  title: "Tvåstegsverifiering – llena admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminMfaPage() {
  await requireAdminAnyAal();

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <div className="rounded-card bg-surface p-6">
        <h1 className="mb-4 text-19 font-bold text-ink">Tvåstegsverifiering</h1>
        <MfaPanel />
      </div>
    </main>
  );
}
