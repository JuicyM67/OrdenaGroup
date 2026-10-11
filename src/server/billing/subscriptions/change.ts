import "server-only";

import type Stripe from "stripe";

import {
  isPaidPlan,
  paidPlanSchema,
  type BillingActionResult,
  type BillingErrorCode,
  type PaidPlan,
  type PlanChangePreview,
} from "@/lib/validation/billing";
import { getStripe } from "@/server/payments/stripe/client";

import {
  billingVatRateId,
  planForLookupKey,
  planNetOre,
  planRank,
  VAT_BPS,
} from "./config";
import {
  businessPlanState,
  guardOwner,
  loadBillingRow,
  type BillingRow,
} from "./customer";
import { priceIdFor } from "./prices";
import { retrieveSubscription, syncSubscription } from "./sync";

/**
 * WP-78 (D-059) + ägarens beslut 2026-10-11:
 *  - Uppgradering: direkt med proration (`always_invoice`) och
 *    `pending_if_incomplete` — planen ändras i Stripe (och därmed hos oss)
 *    först när fakturan är betald. Kräver betalningen 3-D Secure skickas
 *    ägaren till fakturans `hosted_invoice_url`.
 *  - Nedgradering mellan betalda planer: vid periodens slut, via en
 *    Subscription Schedule (två faser, sedan `release`). Ingen kredit.
 *  - Under provperioden: bytet gäller direkt utan debitering.
 *  - Gratis = uppsägning vid periodens slut; "Återuppta" ångrar.
 * `businesses.plan` ändras aldrig här — bara via `syncSubscription`.
 */

type Loaded =
  | {
      ok: true;
      row: BillingRow & { stripe_subscription_id: string };
      plan: PaidPlan;
    }
  | { ok: false; code: BillingErrorCode };

async function loadForChange(
  businessId: string,
  opts: { allowPastDue?: boolean } = {},
): Promise<Loaded> {
  const state = await businessPlanState(businessId);
  if (state.plan === "custom")
    return { ok: false, code: "billing_custom_plan" };
  const row = await loadBillingRow(businessId);
  if (!row?.stripe_subscription_id || !row.status) {
    return { ok: false, code: "billing_no_subscription" };
  }
  if (row.status === "past_due" && !opts.allowPastDue) {
    return { ok: false, code: "billing_payment_required" };
  }
  if (
    row.status !== "trialing" &&
    row.status !== "active" &&
    !(row.status === "past_due" && opts.allowPastDue)
  ) {
    return { ok: false, code: "billing_no_subscription" };
  }
  const plan = row.plan;
  if (!isPaidPlan(plan)) return { ok: false, code: "billing_no_subscription" };
  return {
    ok: true,
    row: row as BillingRow & { stripe_subscription_id: string },
    plan,
  };
}

function withVat(netOre: number): { total: number; vat: number } {
  const vat = Math.round((netOre * VAT_BPS) / 10_000);
  return { total: netOre + vat, vat };
}

async function releaseSchedule(sub: Stripe.Subscription): Promise<void> {
  const sched = sub.schedule;
  const id = typeof sched === "string" ? sched : sched?.id;
  if (!id) return;
  const status = typeof sched === "string" ? null : sched?.status;
  if (status && status !== "active" && status !== "not_started") return;
  await getStripe().subscriptionSchedules.release(id);
}

export async function previewChange(input: {
  businessId: string;
  userId: string;
  plan: unknown;
}): Promise<
  | { ok: true; preview: PlanChangePreview }
  | { ok: false; code: BillingErrorCode | "rate_limited" }
> {
  const parsed = paidPlanSchema.safeParse(input.plan);
  if (!parsed.success) return { ok: false, code: "billing_invalid_plan" };
  const denied = await guardOwner(input.userId, input.businessId, {
    rateLimit: false,
  });
  if (denied) return { ok: false, code: denied };
  const loaded = await loadForChange(input.businessId);
  if (!loaded.ok) return loaded;
  const { row } = loaded;
  const target = parsed.data;
  const next = withVat(planNetOre(target));
  const periodEnd = row.current_period_end?.toISOString() ?? null;
  if (row.status === "trialing") {
    return {
      ok: true,
      preview: {
        direction: "trial",
        dueTodayOre: 0,
        nextAmountOre: next.total,
        nextVatOre: next.vat,
        effectiveAt: row.trial_end?.toISOString() ?? periodEnd,
      },
    };
  }
  if (planRank(target) <= planRank(loaded.plan)) {
    return {
      ok: true,
      preview: {
        direction: "downgrade",
        dueTodayOre: 0,
        nextAmountOre: next.total,
        nextVatOre: next.vat,
        effectiveAt: periodEnd,
      },
    };
  }
  try {
    const sub = await retrieveSubscription(row.stripe_subscription_id);
    const item = sub.items.data[0];
    if (!item) return { ok: false, code: "failed" };
    const inv = await getStripe().invoices.createPreview({
      customer: row.stripe_customer_id,
      subscription: sub.id,
      subscription_details: {
        items: [{ id: item.id, price: await priceIdFor(target) }],
        proration_behavior: "always_invoice",
      },
    });
    return {
      ok: true,
      preview: {
        direction: "upgrade",
        dueTodayOre: Math.max(0, inv.amount_due),
        nextAmountOre: next.total,
        nextVatOre: next.vat,
        effectiveAt: periodEnd,
      },
    };
  } catch {
    return { ok: false, code: "failed" };
  }
}

export async function changePlan(input: {
  businessId: string;
  userId: string;
  plan: unknown;
}): Promise<BillingActionResult> {
  const parsed = paidPlanSchema.safeParse(input.plan);
  if (!parsed.success) return { ok: false, code: "billing_invalid_plan" };
  const denied = await guardOwner(input.userId, input.businessId);
  if (denied) return { ok: false, code: denied };
  const loaded = await loadForChange(input.businessId);
  if (!loaded.ok) return loaded;
  const { row } = loaded;
  const target = parsed.data;
  const vatRate = billingVatRateId();
  if (!vatRate) return { ok: false, code: "billing_unavailable" };

  if (
    target === loaded.plan &&
    !row.pending_plan &&
    !row.cancel_at_period_end
  ) {
    return { ok: false, code: "billing_same_plan" };
  }

  const stripe = getStripe();
  try {
    const sub = await retrieveSubscription(row.stripe_subscription_id);
    const item = sub.items.data[0];
    if (!item) return { ok: false, code: "failed" };
    // Ett nytt val ersätter en väntande nedgradering och en uppsägning.
    await releaseSchedule(sub);
    if (sub.cancel_at_period_end || sub.cancel_at !== null) {
      await stripe.subscriptions.update(sub.id, {
        cancel_at_period_end: false,
        ...(sub.cancel_at !== null && !sub.cancel_at_period_end
          ? { cancel_at: "" }
          : {}),
      });
    }

    const currentPlan = planForLookupKey(item.price.lookup_key);
    let url: string | undefined;
    if (target === currentPlan) {
      // Bara ångrad nedgradering/uppsägning.
    } else if (sub.status === "trialing") {
      await stripe.subscriptions.update(sub.id, {
        items: [{ id: item.id, price: await priceIdFor(target) }],
        proration_behavior: "none",
      });
    } else if (currentPlan && planRank(target) > planRank(currentPlan)) {
      const updated = await stripe.subscriptions.update(sub.id, {
        items: [{ id: item.id, price: await priceIdFor(target) }],
        proration_behavior: "always_invoice",
        payment_behavior: "pending_if_incomplete",
        expand: ["latest_invoice"],
      });
      const inv = updated.latest_invoice;
      if (
        updated.pending_update &&
        inv &&
        typeof inv !== "string" &&
        inv.status === "open"
      ) {
        // Betalningen gick inte igenom direkt (3-D Secure eller nekat kort):
        // planen är oförändrad tills fakturan betalas.
        if (inv.hosted_invoice_url?.startsWith("https://")) {
          url = inv.hosted_invoice_url;
        } else {
          return { ok: false, code: "billing_payment_required" };
        }
      }
    } else {
      // Nedgradering vid periodens slut.
      const sched = await stripe.subscriptionSchedules.create({
        from_subscription: sub.id,
      });
      const phase = sched.current_phase;
      if (!phase) return { ok: false, code: "failed" };
      await stripe.subscriptionSchedules.update(sched.id, {
        end_behavior: "release",
        phases: [
          {
            items: [{ price: item.price.id, quantity: 1 }],
            start_date: phase.start_date,
            end_date: phase.end_date,
            default_tax_rates: [vatRate],
            proration_behavior: "none",
          },
          {
            items: [{ price: await priceIdFor(target), quantity: 1 }],
            duration: { interval: "month", interval_count: 1 },
            default_tax_rates: [vatRate],
            proration_behavior: "none",
          },
        ],
      });
    }
    await syncSubscription(sub.id, { expectBusinessId: input.businessId });
    return url ? { ok: true, url } : { ok: true };
  } catch (e) {
    if (
      e &&
      typeof e === "object" &&
      (e as { type?: string }).type === "StripeCardError"
    ) {
      return { ok: false, code: "billing_payment_required" };
    }
    console.error("billing: planbyte misslyckades", { code: "change_failed" });
    return { ok: false, code: "failed" };
  }
}

/** "Byt till Gratis": uppsägning vid periodens slut (eller provets slut). */
export async function cancelSubscription(input: {
  businessId: string;
  userId: string;
}): Promise<BillingActionResult> {
  const denied = await guardOwner(input.userId, input.businessId);
  if (denied) return { ok: false, code: denied };
  const loaded = await loadForChange(input.businessId, { allowPastDue: true });
  if (!loaded.ok) return loaded;
  try {
    const sub = await retrieveSubscription(loaded.row.stripe_subscription_id);
    await releaseSchedule(sub);
    await getStripe().subscriptions.update(sub.id, {
      cancel_at_period_end: true,
    });
    await syncSubscription(sub.id, { expectBusinessId: input.businessId });
    return { ok: true };
  } catch {
    console.error("billing: uppsägning misslyckades", {
      code: "cancel_failed",
    });
    return { ok: false, code: "failed" };
  }
}

export async function resumeSubscription(input: {
  businessId: string;
  userId: string;
}): Promise<BillingActionResult> {
  const denied = await guardOwner(input.userId, input.businessId);
  if (denied) return { ok: false, code: denied };
  const loaded = await loadForChange(input.businessId, { allowPastDue: true });
  if (!loaded.ok) return loaded;
  try {
    const sub = await retrieveSubscription(loaded.row.stripe_subscription_id);
    await getStripe().subscriptions.update(sub.id, {
      cancel_at_period_end: false,
      ...(sub.cancel_at !== null && !sub.cancel_at_period_end
        ? { cancel_at: "" }
        : {}),
    });
    await syncSubscription(sub.id, { expectBusinessId: input.businessId });
    return { ok: true };
  } catch {
    console.error("billing: återupptag misslyckades", {
      code: "resume_failed",
    });
    return { ok: false, code: "failed" };
  }
}
