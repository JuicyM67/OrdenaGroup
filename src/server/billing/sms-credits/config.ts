import "server-only";

import { market } from "@/config/brand";
import { stripeSecretKey } from "@/server/payments/stripe/client";

/**
 * WP-76 (D-053): sms-krediter finns bara i SE. Köpet kräver dessutom Stripe
 * (`STRIPE_SECRET_KEY`) och en fast skattesats 25 % exklusive moms skapad i
 * Stripe (`STRIPE_SMS_VAT_RATE_ID`). Saknas någon av dem döljs köpet (D-035)
 * — saldo och förbrukning visas ändå i SE.
 */
export function smsCreditsMarket(): boolean {
  return market === "SE";
}

export function smsVatRateId(): string | null {
  const v = process.env.STRIPE_SMS_VAT_RATE_ID?.trim();
  return v ? v : null;
}

export function smsCreditsPurchasable(): boolean {
  return (
    smsCreditsMarket() && stripeSecretKey() !== null && smsVatRateId() !== null
  );
}
