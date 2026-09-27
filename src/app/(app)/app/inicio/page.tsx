// D-020 (D-019 i planen): fixture-routes är bara aktiva utanför produktion
// (`isDesignLabEnabled`, öppen i staging med `DESIGN_LAB=1`). Testar layouten på en riktig
// URL/fönsterstorlek utan att fiktiva bokningar syns publikt — se
// docs/tasks/plans/WP-11.md §4 steg 7. Ingen `src/app/(app)/layout.tsx` här (utanför scope,
// se planen §2): inloggning och den delade layouten för `(app)` är WP-15.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isDesignLabEnabled } from "@/app/design-lab/gate";
import { getInicioFixtures } from "@/app/design-lab/main/fixtures";
import { InicioScreen } from "@/components/dashboard/inicio-screen";
import { inicio } from "@/i18n";

export const metadata: Metadata = {
  title: inicio.titulo,
  robots: { index: false, follow: false },
};

// VERCEL_ENV måste läsas per request, se src/app/design-lab/layout.tsx.
export const dynamic = "force-dynamic";

export default function InicioPage() {
  if (
    !isDesignLabEnabled({
      VERCEL_ENV: process.env.VERCEL_ENV,
      DESIGN_LAB: process.env.DESIGN_LAB,
    })
  ) {
    notFound();
  }

  // WP-21: ersätts av riktig data (Supabase, server actions, auth).
  const data = getInicioFixtures("referencia");

  return <InicioScreen data={data} />;
}
