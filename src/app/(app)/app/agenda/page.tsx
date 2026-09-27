// Se docs/tasks/plans/WP-12.md steg 8. Grind (D-020/isDesignLabEnabled — stängd i
// produktion), noindex, fixtures (riktig data kopplas in i WP-20/21). Popovern är stängd
// från början. `?vista=&fecha=` läses server-side (inga klient-only sökparametrar).
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AgendaScreen } from "@/components/agenda/agenda-screen";
import { agendaFixture } from "@/app/design-lab/agenda/fixtures";
import { isDesignLabEnabled } from "@/app/design-lab/gate";
import { parseLocalDate } from "@/lib/format/dates";

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
  if (
    !isDesignLabEnabled({
      VERCEL_ENV: process.env.VERCEL_ENV,
      DESIGN_LAB: process.env.DESIGN_LAB,
    })
  ) {
    notFound();
  }

  const { vista, fecha } = await searchParams;
  const parsedFecha = fecha ? parseLocalDate(fecha) : null;

  return (
    <AgendaScreen
      data={agendaFixture}
      initialVista={vista === "dia" ? "dia" : "semana"}
      initialFecha={parsedFecha?.ok ? parsedFecha.value : undefined}
    />
  );
}
