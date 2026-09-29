// WP-21: riktig data (D-020s grind och fixtures flyttade till /design-lab/agenda,
// se docs/decisions/DECISIONS.md D-024). Ägare utan företag → /app/onboarding (samma
// mönster som /app/page.tsx, WP-15). `?vista=&fecha=` läses server-side. Llegó/No vino
// sparas via en server action bunden till ägaren/företaget (closure, samma mönster som
// `src/app/[slug]/page.tsx` — se kommentaren i `src/app/[slug]/actions.ts`).
//
// WP-21b: manuell bokning och flytt (server actions, samma closure-mönster). Samtycket
// (om rutan var ikryssad) sparas i ett eget steg efter att bokningen redan finns — ett fel
// där loggas här (utanför `src/server`, där `console.*` är tillåtet, till skillnad från
// `src/server/owner/manual-booking.ts`) och svaret blir ändå `ok` (samma avvägning som
// `src/app/[slug]/actions.ts`/`submit.ts`, WP-20).
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AgendaScreen } from "@/components/agenda/agenda-screen";
import { parseLocalDate, APP_TZ, toLocalDate } from "@/lib/format/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pgErrorCode } from "@/server/db/errors";
import { getOwnerBusiness } from "@/server/onboarding/owner-business";
import { loadOwnerAgendaWeek } from "@/server/owner/agenda";
import { markArrival, type ArrivalStatus } from "@/server/owner/arrival";
import {
  createManualBooking,
  loadOwnerBookableCatalog,
  moveOwnerBooking,
  saveManualConsent,
} from "@/server/owner/manual-booking";

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
  const focus = parsedFecha?.ok ? parsedFecha.value : toLocalDate(now, APP_TZ);

  const [data, catalog] = await Promise.all([
    loadOwnerAgendaWeek(user.id, business.id, focus, now),
    loadOwnerBookableCatalog(user.id, business.id),
  ]);

  const onArrival = async (bookingId: string, status: ArrivalStatus) => {
    "use server";
    await markArrival(user.id, business.id, bookingId, status);
  };

  const onCreateManualBooking = async (input: unknown) => {
    "use server";
    const result = await createManualBooking(
      user.id,
      business.id,
      new Date(),
      input,
    );
    if (!result.ok) return { ok: false as const, error: result.error };
    if (result.value.consent) {
      try {
        await saveManualConsent(
          user.id,
          business.id,
          result.value.customerId,
          new Date(),
        );
      } catch (e) {
        // Ingen persondata (bara SQLSTATE) — bokningen finns redan och svarar ok.
        console.error(
          "agenda: kunde inte spara det manuella samtycket (bokningen skapades ändå)",
          {
            businessId: business.id,
            bookingId: result.value.bookingId,
            sqlstate: pgErrorCode(e),
          },
        );
      }
    }
    return { ok: true as const };
  };

  const onMoveBooking = async (input: unknown) => {
    "use server";
    const result = await moveOwnerBooking(
      user.id,
      business.id,
      new Date(),
      input,
    );
    if (!result.ok) return { ok: false as const, error: result.error };
    return { ok: true as const };
  };

  return (
    <AgendaScreen
      data={data}
      initialVista={vista === "dia" ? "dia" : "semana"}
      initialFecha={parsedFecha?.ok ? parsedFecha.value : undefined}
      showMover={true}
      onArrival={onArrival}
      catalog={catalog}
      businessName={business.name}
      onCreateManualBooking={onCreateManualBooking}
      onMoveBooking={onMoveBooking}
    />
  );
}
