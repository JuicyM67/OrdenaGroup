import "server-only";

import type { PaidPlan } from "@/lib/validation/billing";
import { getStripe } from "@/server/payments/stripe/client";

import { lookupKeyFor, planNetOre, VAT_BPS } from "./config";
import { BillingError } from "./errors";

/**
 * WP-78 (D-059): pris-id slås upp via lookup-nyckeln (skapad av
 * `scripts/stripe-billing-setup.ts`), med kort cache per process. Priset måste
 * stämma med `pricing.ts` (SEK, månad, exklusiv moms) — annars avvisas
 * köpet hellre än att fel belopp dras.
 */
const TTL_MS = 10 * 60 * 1000;
let cache: { at: number; ids: Map<PaidPlan, string> } | undefined;

export async function priceIdFor(
  plan: PaidPlan,
  now = Date.now(),
): Promise<string> {
  if (!cache || now - cache.at > TTL_MS) {
    const keys = (["emprende", "equipo", "local"] as const).map((p) =>
      lookupKeyFor(p),
    );
    const list = await getStripe().prices.list({
      lookup_keys: keys,
      active: true,
      limit: 10,
    });
    const ids = new Map<PaidPlan, string>();
    for (const p of ["emprende", "equipo", "local"] as const) {
      const price = list.data.find((x) => x.lookup_key === lookupKeyFor(p));
      if (
        price &&
        price.currency === "sek" &&
        price.unit_amount === planNetOre(p) &&
        price.recurring?.interval === "month" &&
        price.tax_behavior === "exclusive"
      ) {
        ids.set(p, price.id);
      }
    }
    cache = { at: now, ids };
  }
  const id = cache.ids.get(plan);
  if (!id) throw new BillingError("price_missing", plan);
  return id;
}

/** Bara för tester. */
export function resetPriceCache(): void {
  cache = undefined;
}

/** Skattesatsen kontrolleras en gång per process: 25 %, exklusiv, aktiv
 * (samma kontroll som sms-krediterna, D-053). */
let vatCheck: { id: string; ok: Promise<boolean> } | undefined;

export function vatRateValid(id: string): Promise<boolean> {
  if (vatCheck?.id !== id) {
    const ok = getStripe()
      .taxRates.retrieve(id)
      .then(
        (tr) => tr.active && !tr.inclusive && tr.percentage === VAT_BPS / 100,
      );
    ok.catch(() => {
      vatCheck = undefined;
    });
    vatCheck = { id, ok };
  }
  return vatCheck.ok;
}
