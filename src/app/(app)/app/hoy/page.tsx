// Se docs/tasks/plans/WP-14.md §4 steg 5. Riktig route: samma komponent och fixtures som
// /design-lab/hoy (WP-20/21 kopplar in riktig data). Stängd i produktion om inte
// isDesignLabEnabled() (D-020), noindex.
//
// Till skillnad från /design-lab/hoy (fast 390×844-artboard för npm run visual) renderas den
// här sidan i full, responsiv bredd — det är den som testas vid 360 px (e2e/hoy.spec.ts).
// `?estado=` stöds även här (samma fixtures.ts) så att e2e kan pröva reflow/scroll i alla
// tillstånd utan att röra den pixel-exakta artboarden.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isDesignLabEnabled } from "@/app/design-lab/gate";
import { buildFixture } from "@/app/design-lab/hoy/fixtures";
import { HoyScreen } from "@/components/mobile/hoy-screen";
import { hoy } from "@/i18n/es-CL";

export const metadata: Metadata = {
  title: hoy.titulo,
  robots: { index: false, follow: false },
};

// VERCEL_ENV måste läsas per request, inte bakas in vid build (se design-lab/layout.tsx).
export const dynamic = "force-dynamic";

export default async function HoyPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  if (
    !isDesignLabEnabled({
      VERCEL_ENV: process.env.VERCEL_ENV,
      DESIGN_LAB: process.env.DESIGN_LAB,
    })
  ) {
    notFound();
  }
  const { estado } = await searchParams;
  const data = buildFixture(estado);
  return <HoyScreen key={estado ?? "default"} data={data} />;
}
