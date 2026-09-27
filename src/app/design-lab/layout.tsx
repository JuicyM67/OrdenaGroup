import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { isDesignLabEnabled } from "./gate";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// VERCEL_ENV måste läsas per request, inte bakas in vid build (annars skiljer sig
// lokal `next build && next start` med olika VERCEL_ENV från det faktiska svaret).
export const dynamic = "force-dynamic";

export default function DesignLabLayout({ children }: { children: ReactNode }) {
  if (
    !isDesignLabEnabled({
      VERCEL_ENV: process.env.VERCEL_ENV,
      DESIGN_LAB: process.env.DESIGN_LAB,
    })
  ) {
    notFound();
  }
  // Ingen egen marginal eller ram här — annars påverkas skärmdumparna i npm run visual.
  return children;
}
