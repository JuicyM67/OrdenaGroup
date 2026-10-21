// Abonnemangspriser (D-025) i heltal CLP. Texterna för planerna ligger i i18n;
// bara beloppen här.
import { formatClp } from "@/lib/format/clp";

export type PlanId = "gratis" | "emprende" | "equipo" | "local";

const precios: Record<PlanId, number> = {
  gratis: 0,
  emprende: 9990,
  equipo: 19990,
  local: 34990,
};

export function precioPlan(id: PlanId): number {
  return precios[id];
}

/** Formaterat belopp, t.ex. "$9.990" — samma regel som `formatPrecioPlan` men
 * för ett godtyckligt heltal (t.ex. pris per anställd i /precios räknare,
 * sitio-v3). */
export function formatMonto(amount: number): string {
  return formatClp(amount);
}

/** Formaterat månadspris, t.ex. "$9.990". */
export function formatPrecioPlan(id: PlanId): string {
  return formatMonto(precioPlan(id));
}
