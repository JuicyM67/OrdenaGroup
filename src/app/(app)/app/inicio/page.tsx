// WP-21: riktig data (D-020s grind och fixtures flyttade till /design-lab/main, se
// docs/decisions/DECISIONS.md D-024). Ägare utan företag → /app/onboarding.
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { InicioScreen } from "@/components/dashboard/inicio-screen";
import { inicio } from "@/i18n";
import { APP_TZ, toLocalDate } from "@/lib/format/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnerBusiness } from "@/server/onboarding/owner-business";
import { loadOwnerInicio } from "@/server/owner/inicio";
import { ownerNameParts } from "@/server/owner/shared";

export const metadata: Metadata = {
  title: inicio.titulo,
  robots: { index: false, follow: false },
};

// VERCEL_ENV måste läsas per request, se src/app/design-lab/layout.tsx.
export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await getOwnerBusiness(user.id);
  if (!business) redirect("/app/onboarding");

  const now = new Date();
  const today = toLocalDate(now, APP_TZ);
  const owner = ownerNameParts(user.email);
  const data = await loadOwnerInicio(user.id, business.id, today, now, owner);

  return (
    <InicioScreen
      data={data}
      bookingLink={{ slug: business.slug, businessName: business.name }}
    />
  );
}
