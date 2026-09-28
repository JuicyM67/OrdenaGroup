// Abonnemangspriser per marknad (D-025). CL i heltal CLP, SE i heltal öre
// (exkl. moms). Texterna för planerna ligger i i18n; bara beloppen här.
import { formatClp } from "@/lib/format/clp";

import { market, type Market } from "./brand";

export type PlanId = "gratis" | "emprende" | "equipo" | "local";

const precios: Record<Market, Record<PlanId, number>> = {
  CL: { gratis: 0, emprende: 9990, equipo: 19990, local: 34990 },
  SE: { gratis: 0, emprende: 29900, equipo: 49900, local: 79900 },
};

export function precioPlan(id: PlanId, m: Market = market): number {
  return precios[m][id];
}

/** Formaterat månadspris, t.ex. "$9.990" eller "299 kr". */
export function formatPrecioPlan(id: PlanId, m: Market = market): string {
  const belopp = precioPlan(id, m);
  if (m === "SE") {
    const kr = belopp / 100;
    return `${new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 2 }).format(kr)} kr`;
  }
  return formatClp(belopp);
}
