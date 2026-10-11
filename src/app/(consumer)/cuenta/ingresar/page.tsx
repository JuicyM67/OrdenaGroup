// WP-67 (D-054): Skapa konto / Logga in för kunder (CL `/cuenta/ingresar`, SE
// `/konto/logga-in`). Redan inloggad med kundkonto → kontot. Google-knappen
// visas bara när `NEXT_PUBLIC_GOOGLE_AUTH=1` (ägaren har skapat credentials,
// D-035); magisk länk fungerar alltid.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountAuthShell } from "@/components/account/account-auth-shell";
import { SignInCard } from "@/components/account/sign-in-card";
import { appHref, cuentaHref, hrefLegal } from "@/config/routes";
import { cuenta } from "@/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasAccount } from "@/server/accounts/account";

import { requestAccountMagicLink, signInWithGoogle } from "./actions";

export const metadata: Metadata = {
  title: cuenta.meta.ingresar,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ERROR_RE = /^[a-z_]{1,40}$/;

export default async function CuentaIngresarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cuenta?: string; email?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && (await hasAccount(user.id))) redirect(cuentaHref("cuenta"));

  const { error, cuenta: estadoCuenta, email } = await searchParams;
  // Förifyll bara något som ser ut som en e-postadress (kommer från "För kunder").
  const initialEmail =
    email && email.length <= 254 && /^[^\s@]+@[^\s@]+$/.test(email)
      ? email
      : undefined;
  const notice =
    estadoCuenta === "eliminada"
      ? cuenta.privacidad.eliminada
      : estadoCuenta === "eliminada-negocio"
        ? cuenta.privacidad.eliminadaNegocio
        : undefined;
  const t = cuenta.ingresar;
  const linkClass =
    "font-semibold text-ink underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

  return (
    <AccountAuthShell>
      {notice ? (
        <p
          role="status"
          className="mb-4 rounded-control bg-success-bg p-3 text-14 font-semibold text-success-fg"
        >
          {notice}
        </p>
      ) : null}
      <SignInCard
        onRequestMagicLink={requestAccountMagicLink}
        googleAction={signInWithGoogle}
        googleEnabled={process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1"}
        initialErrorCode={error && ERROR_RE.test(error) ? error : undefined}
        initialEmail={initialEmail}
        legal={
          <>
            {t.legalAntes}
            <Link href={hrefLegal("terminos")} className={linkClass}>
              {t.legalTerminos}
            </Link>
            {t.legalY}
            <Link href={hrefLegal("privacidad")} className={linkClass}>
              {t.legalPrivacidad}
            </Link>
            {t.legalDespues}
          </>
        }
        businessLink={
          <Link
            href={user ? appHref("appOnboarding") : "/login"}
            className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {t.negocio}
          </Link>
        }
      />
    </AccountAuthShell>
  );
}
