// /login (F1, WP-15): magisk länk via e-post. Redan inloggad → /app (page.tsx där skickar
// vidare till onboarding eller /app/inicio beroende på om ägaren redan har ett företag).
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { acceso } from "@/i18n";

import { requestMagicLink } from "./actions";

export const metadata: Metadata = {
  title: acceso.login.titulo,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/app");

  const { error } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <LoginForm
          onRequestMagicLink={requestMagicLink}
          initialErrorCode={error}
        />
      </div>
    </main>
  );
}
