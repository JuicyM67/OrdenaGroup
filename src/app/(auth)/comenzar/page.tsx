// /comenzar (WP-83, D-068): registrering av ett nytt företag. Samma mejl som /login
// (`requestMagicLink`: kod + magisk länk; kontot skapas när länken öppnas eller koden
// skrivs in, och /app skickar vidare till onboarding), men texten är skriven för den som
// ska skapa sin agenda. Redan inloggad → /app, precis som /login.
//
// Stängd beta (`INVITE_ONLY_BETA`, src/config/beta.ts): i stället för registreringen
// visas beta-sidan ("Pedir una invitación", mejl till hola@ med `?email=` i texten).
// Inloggade skickas fortfarande till /app, som avgör vart kontot ska (/app/beta om det
// saknar företag och inbjudan).
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { BetaInvitacion } from "@/components/auth/beta-invitacion";
import { LoginForm } from "@/components/auth/login-form";
import { INVITE_ONLY_BETA } from "@/config/beta";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { acceso } from "@/i18n/auth";

import { verifyEmailCode } from "@/app/auth/code-actions";
import { requestMagicLink } from "../login/actions";

export const metadata: Metadata = {
  title: INVITE_ONLY_BETA ? acceso.beta.titulo : acceso.registro.titulo,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ComenzarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/app");

  const { error, email } = await searchParams;
  // Förifyll bara något som ser ut som en e-postadress (kommer från startsidans fält).
  const initialEmail =
    email && email.length <= 254 && /^[^\s@]+@[^\s@]+$/.test(email)
      ? email
      : undefined;

  if (INVITE_ONLY_BETA) {
    return (
      <AuthShell variant="beta">
        <BetaInvitacion email={initialEmail} />
      </AuthShell>
    );
  }

  return (
    <AuthShell variant="registro">
      <LoginForm
        variant="registro"
        onRequestMagicLink={requestMagicLink}
        onVerifyCode={verifyEmailCode}
        initialErrorCode={error}
        initialEmail={initialEmail}
      />
    </AuthShell>
  );
}
