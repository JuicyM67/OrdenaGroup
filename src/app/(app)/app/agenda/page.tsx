// WP-21: riktig data (D-020s grind och fixtures flyttade till /design-lab/agenda,
// se docs/decisions/DECISIONS.md D-024). Ägare utan företag → /app/onboarding (samma
// mönster som /app/page.tsx, WP-15). `?vista=&fecha=` läses server-side. Llegó/No vino
// sparas via en server action bunden till ägaren/företaget (closure, samma mönster som
// `src/app/[slug]/page.tsx` — se kommentaren i `src/app/[slug]/actions.ts`).
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AgendaScreen } from "@/components/agenda/agenda-screen";
import { parseLocalDate, SANTIAGO, toLocalDate } from "@/lib/format/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnerBusiness } from "@/server/onboarding/owner-business";
import { loadOwnerAgendaWeek } from "@/server/owner/agenda";
import { markArrival, type ArrivalStatus } from "@/server/owner/arrival";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// VERCEL_ENV måste läsas per request, se src/app/design-lab/layout.tsx.
export const dynamic = "force-dynamic";

export default async function AppAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; fecha?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await getOwnerBusiness(user.id);
  if (!business) redirect("/app/onboarding");

  const { vista, fecha } = await searchParams;
  const parsedFecha = fecha ? parseLocalDate(fecha) : null;
  const now = new Date();
  const focus = parsedFecha?.ok
    ? parsedFecha.value
    : toLocalDate(now, SANTIAGO);

  const data = await loadOwnerAgendaWeek(user.id, business.id, focus, now);

  const onArrival = async (bookingId: string, status: ArrivalStatus) => {
    "use server";
    await markArrival(user.id, business.id, bookingId, status);
  };

  return (
    <AgendaScreen
      data={data}
      initialVista={vista === "dia" ? "dia" : "semana"}
      initialFecha={parsedFecha?.ok ? parsedFecha.value : undefined}
      showMover={false}
      onArrival={onArrival}
    />
  );
}
