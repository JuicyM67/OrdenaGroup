import "server-only";

import type { BusinessPlan } from "@/config/plans";
import {
  isPaidPlan,
  type BillingStatus,
  type PaidPlan,
} from "@/lib/validation/billing";
import { getStripe } from "@/server/payments/stripe/client";

import { billingAvailable } from "./config";
import { businessPlanState, loadBillingRow } from "./customer";

/**
 * WP-78 (D-059): läget för Plan-fliken och bannern. Läser bara vår spegel
 * (`billing_subscriptions`); nästa fakturabelopp hämtas från Stripe med kort
 * timeout (2 s) — svarar Stripe inte visas datumet utan belopp.
 */

export type BillingOverview = {
  readonly available: boolean;
  readonly businessPlan: BusinessPlan;
  /** Pilot/admin: planen styrs av `plan_override_until` till detta datum. */
  readonly overrideUntil: string | null;
  readonly subscription: {
    readonly plan: PaidPlan;
    readonly status: BillingStatus;
    readonly trialEnd: string | null;
    readonly periodEnd: string | null;
    readonly cancelAtPeriodEnd: boolean;
    readonly pendingPlan: PaidPlan | null;
    readonly graceUntil: string | null;
    readonly card: { brand: string; last4: string } | null;
  } | null;
  readonly trialAvailable: boolean;
  /** Har en Stripe-kund (Portalen kan öppnas). */
  readonly hasCustomer: boolean;
};

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

export async function loadBillingOverview(
  businessId: string,
): Promise<BillingOverview> {
  const [state, row] = await Promise.all([
    businessPlanState(businessId),
    loadBillingRow(businessId),
  ]);
  const plan = state.plan as BusinessPlan;
  const sub =
    row?.stripe_subscription_id && row.status && isPaidPlan(row.plan)
      ? {
          plan: row.plan,
          status: row.status as BillingStatus,
          trialEnd: iso(row.trial_end),
          periodEnd: iso(row.current_period_end),
          cancelAtPeriodEnd: row.cancel_at_period_end,
          pendingPlan: isPaidPlan(row.pending_plan) ? row.pending_plan : null,
          graceUntil: iso(row.grace_until),
          card:
            row.card_brand && row.card_last4
              ? { brand: row.card_brand, last4: row.card_last4 }
              : null,
        }
      : null;
  return {
    available: billingAvailable(),
    businessPlan: plan,
    overrideUntil:
      state.overrideUntil && state.overrideUntil.getTime() > Date.now()
        ? state.overrideUntil.toISOString()
        : null,
    subscription: sub,
    trialAvailable: !row?.trial_used_at,
    hasCustomer: row !== null,
  };
}

/** Nästa ordinarie faktura (belopp inkl. moms, öre), `null` vid timeout/fel. */
export async function loadUpcomingAmount(
  businessId: string,
  timeoutMs = 2000,
): Promise<number | null> {
  const row = await loadBillingRow(businessId);
  if (!row?.stripe_subscription_id || !billingAvailable()) return null;
  const call = getStripe()
    .invoices.createPreview({
      customer: row.stripe_customer_id,
      subscription: row.stripe_subscription_id,
    })
    .then((inv) => inv.amount_due)
    .catch(() => null);
  const timeout = new Promise<null>((r) =>
    setTimeout(() => r(null), timeoutMs),
  );
  return Promise.race([call, timeout]);
}

/** Bannern i appens sidhuvud (bara ägaren, SE): betalningen misslyckades. */
export type BillingBanner = {
  readonly plan: PaidPlan;
  readonly until: string;
};

export async function loadBillingBanner(
  businessId: string,
): Promise<BillingBanner | null> {
  if (!billingAvailable()) return null;
  const row = await loadBillingRow(businessId);
  if (row?.status !== "past_due" || !row.grace_until || !isPaidPlan(row.plan)) {
    return null;
  }
  return { plan: row.plan, until: row.grace_until.toISOString() };
}
