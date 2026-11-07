// /login (F1, WP-15): magisk länk via e-post. Redan inloggad → /app (page.tsx där skickar
// vidare till onboarding eller /app/inicio beroende på om ägaren redan har ett företag).
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { acceso } from "@/i18n/auth";

import { verifyEmailCode } from "@/app/auth/code-actions";
import { requestMagicLink } from "./actions";

export const metadata: Metadata = {
  title: acceso.login.titulo,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
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

  return (
    <AuthShell>
      <LoginForm
        onRequestMagicLink={requestMagicLink}
        onVerifyCode={verifyEmailCode}
        initialErrorCode={error}
        initialEmail={initialEmail}
      />
    </AuthShell>
  );
}
