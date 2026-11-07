// /app/onboarding (F1, WP-15 slim; WP-83 stegpanel): import → företag → rubro → plats →
// tjänster → equipo → horario → din sida → plan → link.
// Inloggning krävs redan av src/app/(app)/layout.tsx. Ägare som redan har ett företag
// skickas till /app/inicio (onboarding är bara för kontot första gången).
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { SessionBar } from "@/components/onboarding/session-bar";
import { appHref } from "@/config/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getOwnerBusiness,
  isOnboardingDraft,
} from "@/server/onboarding/owner-business";
import { onboarding } from "@/i18n";
import { withServiceTx } from "@/server/db/tx";
import { platformNames } from "@/server/import/platforms";
import { loadPlanIn } from "@/server/plans/entitlements";
import { isImportEnabled, isImportPaused } from "@/server/import/runs";

import {
  confirmPageImageUploadAction,
  createPageImageUploadAction,
  deletePageImageAction,
  requestPlanAction,
  submitOnboarding,
  updatePageProfileAction,
} from "./actions";

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

  // F19/WP-36: un negocio creado por una invitación de admin (`comuna`/
  // `category` en blanco) todavía necesita pasar por acá — solo un negocio
  // YA completo manda a /app/inicio.
  const business = await getOwnerBusiness(user.id);
  if (business && !isOnboardingDraft(business)) redirect(appHref("appInicio"));

  // WP-66 (D-035): bara när importen finns och inte är pausad (månadstaket).
  const importer =
    isImportEnabled() && !(await isImportPaused())
      ? { platformNames: platformNames() }
      : undefined;

  // WP-83 (D-068): planvalet bara när planen inte redan styrs av oss — ett
  // utkast från en admin-inbjudan kan redan ha en plan eller "Facturación manual".
  const planInfo = business
    ? await withServiceTx((q) => loadPlanIn(q, business.id))
    : null;
  const showPlans =
    !planInfo || (planInfo.plan === "free" && planInfo.billingMode === "app");

  return (
    <main className="min-h-dvh bg-canvas px-4 py-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <SessionBar email={user.email ?? ""} />
        <OnboardingWizard
          onSubmit={submitOnboarding}
          pageActions={{
            createImageUpload: createPageImageUploadAction,
            confirmImageUpload: confirmPageImageUploadAction,
            deleteImage: deletePageImageAction,
            updateProfile: updatePageProfileAction,
          }}
          importer={importer}
          onRequestPlan={showPlans ? requestPlanAction : undefined}
        />
      </div>
    </main>
  );
}
