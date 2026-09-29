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

/** Formaterat belopp, t.ex. "$9.990" eller "299 kr" — samma regel som `formatPrecioPlan`
 * men för ett godtyckligt heltal (t.ex. pris per anställd i /precios räknare, sitio-v3),
 * i stället för att hårdkoda per-marknadsformatet på fler ställen. */
export function formatMonto(amount: number, m: Market = market): string {
  if (m === "SE") {
    const kr = amount / 100;
    return `${new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 2 }).format(kr)} kr`;
  }
  return formatClp(amount);
}

/** Formaterat månadspris, t.ex. "$9.990" eller "299 kr". */
export function formatPrecioPlan(id: PlanId, m: Market = market): string {
  return formatMonto(precioPlan(id, m), m);
}
