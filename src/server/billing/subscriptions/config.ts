import "server-only";

import { market } from "@/config/brand";
import { precioPlan } from "@/config/pricing";
import type { PaidPlan } from "@/lib/validation/billing";
import { stripeSecretKey } from "@/server/payments/stripe/client";

/**
 * WP-78 (D-059): abonnemang via Stripe Billing finns bara i SE. Kräver
 * `STRIPE_SECRET_KEY`, en fast skattesats 25 % exklusive moms
 * (`STRIPE_VAT_RATE_ID`, med D-053:s `STRIPE_SMS_VAT_RATE_ID` som reserv) och
 * Customer Portal-konfigurationen (`STRIPE_BILLING_PORTAL_CONFIG_ID`). Saknas
 * något ser Plan-fliken ut som före WP-78 (D-035).
 */

/** Ägarens beslut 2026-10-11: 14 dagar, utan kort, en gång per företag. */
export const TRIAL_DAYS = 14;
/** Grace period vid misslyckad betalning (speglas i SQL, `billing_apply_subscription`). */
export const GRACE_DAYS = 14;
/** Moms 25 % (fast skattesats i Stripe, exklusiv; kontrolleras i `prices.ts`). */
export const VAT_BPS = 2500;
/** Version i lookup-nyckeln; höjs när ett belopp i `pricing.ts` ändras. */
export const PRICE_VERSION = 1;

export function billingMarket(): boolean {
  return market === "SE";
}

export function billingVatRateId(): string | null {
  const v =
    process.env.STRIPE_VAT_RATE_ID?.trim() ||
    process.env.STRIPE_SMS_VAT_RATE_ID?.trim();
  return v ? v : null;
}

export function billingPortalConfigId(): string | null {
  const v = process.env.STRIPE_BILLING_PORTAL_CONFIG_ID?.trim();
  return v ? v : null;
}

export function billingAvailable(): boolean {
  return (
    billingMarket() &&
    stripeSecretKey() !== null &&
    billingVatRateId() !== null &&
    billingPortalConfigId() !== null
  );
}

/** `bb_se_<plan>_monthly_v<n>` — koden refererar bara lookup-nycklar. */
export function lookupKeyFor(plan: PaidPlan, version = PRICE_VERSION): string {
  return `bb_se_${plan}_monthly_v${version}`;
}

const LOOKUP_RE = /^bb_se_(emprende|equipo|local)_monthly_v\d+$/;

/** Planen för ett pris (alla versioner); okänd nyckel → `null`. */
export function planForLookupKey(
  key: string | null | undefined,
): PaidPlan | null {
  const m = key ? LOOKUP_RE.exec(key) : null;
  return m ? (m[1] as PaidPlan) : null;
}

/** Nettobelopp i öre ur `pricing.ts` (samma som setup-skriptet skapar). */
export function planNetOre(plan: PaidPlan): number {
  return precioPlan(plan, "SE");
}

/** Ordning för upp-/nedgradering. */
export function planRank(plan: PaidPlan): number {
  return plan === "emprende" ? 1 : plan === "equipo" ? 2 : 3;
}

/** Fakturans sida i Stripe: bara https://invoice.stripe.com/… godtas. */
export function isStripeInvoiceUrl(
  url: string | null | undefined,
): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "invoice.stripe.com";
  } catch {
    return false;
  }
}
