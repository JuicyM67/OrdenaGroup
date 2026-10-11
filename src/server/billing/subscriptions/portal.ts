import "server-only";

import { appHref } from "@/config/routes";
import type { BillingActionResult } from "@/lib/validation/billing";
import { appBaseUrl, getStripe } from "@/server/payments/stripe/client";

import { billingPortalConfigId } from "./config";
import { guardOwner, loadBillingRow } from "./customer";

/**
 * WP-78 (D-059): Stripe Customer Portal för kort, faktureringsuppgifter,
 * fakturor/kvitton och uppsägning. Planbyte är AVSTÄNGT i konfigurationen
 * (`STRIPE_BILLING_PORTAL_CONFIG_ID`, skapad av setup-skriptet) — byten görs
 * i appen. Bara ägaren; kräver en Stripe-kund.
 */
export async function openPortal(input: {
  businessId: string;
  userId: string;
}): Promise<BillingActionResult> {
  const denied = await guardOwner(input.userId, input.businessId);
  if (denied) return { ok: false, code: denied };
  const row = await loadBillingRow(input.businessId);
  const configuration = billingPortalConfigId();
  if (!row || !configuration) {
    return { ok: false, code: "billing_no_subscription" };
  }
  try {
    const s = await getStripe().billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      configuration,
      locale: "sv",
      return_url: `${appBaseUrl()}${appHref("appAjustesPlan")}`,
    });
    return { ok: true, url: s.url };
  } catch {
    return { ok: false, code: "failed" };
  }
}
