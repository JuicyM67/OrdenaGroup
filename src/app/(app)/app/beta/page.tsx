// /app/beta: stängd beta (`INVITE_ONLY_BETA`, src/config/beta.ts, ägarens beslut
// 2026-11-09). Hit skickar /app och /app/onboarding ett inloggat konto som varken har ett
// företag, en giltig inbjudan eller är plattformsadmin — samma beta-kort som /comenzar,
// med kontots adress i mejlet och "Cerrar sesión". Inloggning krävs redan av
// src/app/(app)/layout.tsx.
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { BetaInvitacion } from "@/components/auth/beta-invitacion";
import { INVITE_ONLY_BETA } from "@/config/beta";
import { appHref } from "@/config/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { acceso } from "@/i18n/auth";
import { isPlatformAdmin } from "@/server/admin/auth";
import { getOwnerBusiness } from "@/server/onboarding/owner-business";

export const metadata: Metadata = {
  title: acceso.beta.titulo,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BetaPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!INVITE_ONLY_BETA) redirect(appHref("appOnboarding"));
  // Ett företag (även ett utkast från en inbjudan) eller en plattformsadmin: /app vet vart.
  if ((await getOwnerBusiness(user.id)) || (await isPlatformAdmin(user.id))) {
    redirect("/app");
  }

  return (
    <AuthShell variant="beta">
      <BetaInvitacion sesionEmail={user.email ?? undefined} />
    </AuthShell>
  );
}
