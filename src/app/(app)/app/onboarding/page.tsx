// /app/onboarding (F1, WP-15 slim): företag → tjänster → equipo → horario → link.
// Inloggning krävs redan av src/app/(app)/layout.tsx. Ägare som redan har ett företag
// skickas till /app/inicio (onboarding är bara för kontot första gången).
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { SessionBar } from "@/components/onboarding/session-bar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnerBusiness } from "@/server/onboarding/owner-business";
import { onboarding } from "@/i18n";

import { submitOnboarding } from "./actions";

export const metadata: Metadata = {
  title: onboarding.pasos.link,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await getOwnerBusiness(user.id);
  if (business) redirect("/app/inicio");

  return (
    <main className="min-h-dvh bg-canvas px-4 py-8">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <SessionBar email={user.email ?? ""} />
        <OnboardingWizard onSubmit={submitOnboarding} />
      </div>
    </main>
  );
}
