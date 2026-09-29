// WP-21: riktig data (D-020s grind och fixtures flyttade till /design-lab/hoy, se
// docs/decisions/DECISIONS.md D-024). Ägare utan företag → /app/onboarding. `?estado=`
// stöds inte längre här (det var bara design labs tillståndssimulering) — se
// e2e/hoy.spec.ts, tillstånden testas mot /design-lab/hoy.
//
// Till skillnad från /design-lab/hoy (fast 390×844-artboard för npm run visual) renderas
// den här sidan i full, responsiv bredd (testas vid 360 px, e2e/hoy.spec.ts).
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { HoyScreen } from "@/components/mobile/hoy-screen";
import { hoy } from "@/i18n/es-CL";
import { APP_TZ, toLocalDate } from "@/lib/format/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnerBusiness } from "@/server/onboarding/owner-business";
import { markArrival, type ArrivalStatus } from "@/server/owner/arrival";
import { loadOwnerHoy } from "@/server/owner/hoy";
import { ownerNameParts } from "@/server/owner/shared";

export const metadata: Metadata = {
  title: hoy.titulo,
  robots: { index: false, follow: false },
};

// VERCEL_ENV måste läsas per request, inte bakas in vid build (se design-lab/layout.tsx).
export const dynamic = "force-dynamic";

export default async function HoyPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await getOwnerBusiness(user.id);
  if (!business) redirect("/app/onboarding");

  const now = new Date();
  const today = toLocalDate(now, APP_TZ);
  const { name: ownerName } = ownerNameParts(user.email);
  const data = await loadOwnerHoy(user.id, business.id, today, now, ownerName);

  const onArrival = async (bookingId: string, status: ArrivalStatus) => {
    "use server";
    await markArrival(user.id, business.id, bookingId, status);
  };

  return <HoyScreen data={data} onArrival={onArrival} />;
}
