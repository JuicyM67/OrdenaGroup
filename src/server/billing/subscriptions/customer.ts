import "server-only";

import type { Queryable } from "@/server/db/pool";
import { hitRateLimit } from "@/server/db/rate-limit";
import { withOwnerTx, withServiceTx } from "@/server/db/tx";
import { getStripe } from "@/server/payments/stripe/client";

import { billingAvailable } from "./config";

/**
 * WP-78 (D-059): gemensamt för alla server actions — bara inloggad ÄGARE av
 * företaget (RLS-hjälparen, samma som sms-krediter/Betalningar; inte
 * `can_edit_settings`), `billingAvailable()` och rate limit 10/timme/företag.
 */

export type BillingRow = {
  business_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan: string | null;
  status: string | null;
  trial_end: Date | null;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
  pending_plan: string | null;
  grace_until: Date | null;
  card_brand: string | null;
  card_last4: string | null;
  trial_used_at: Date | null;
  open_checkout_session_id: string | null;
  open_checkout_expires_at: Date | null;
};

export type GuardFailure =
  "billing_unavailable" | "billing_not_owner" | "rate_limited";

export async function guardOwner(
  userId: string,
  businessId: string,
  opts: { rateLimit?: boolean } = {},
): Promise<GuardFailure | null> {
  if (!billingAvailable()) return "billing_unavailable";
  const isOwner = await withOwnerTx(userId, async (q) => {
    const r = await q.query<{ ok: boolean }>(
      `select private.is_member($1, array['owner', 'admin']::public.member_role[]) as ok`,
      [businessId],
    );
    return r.rows[0]?.ok ?? false;
  });
  if (!isOwner) return "billing_not_owner";
  if (opts.rateLimit !== false) {
    const allowed = await hitRateLimit({
      scope: "billing:action",
      subject: businessId,
      windowSeconds: 3600,
      max: 10,
    });
    if (!allowed) return "rate_limited";
  }
  return null;
}

export async function loadBillingRowIn(
  q: Queryable,
  businessId: string,
  lock = false,
): Promise<BillingRow | null> {
  const r = await q.query<BillingRow>(
    `select business_id, stripe_customer_id, stripe_subscription_id,
            plan::text as plan, status, trial_end, current_period_end,
            cancel_at_period_end, pending_plan::text as pending_plan,
            grace_until, card_brand, card_last4, trial_used_at,
            open_checkout_session_id, open_checkout_expires_at
       from public.billing_subscriptions
      where business_id = $1 ${lock ? "for update" : ""}`,
    [businessId],
  );
  return r.rows[0] ?? null;
}

export function loadBillingRow(businessId: string): Promise<BillingRow | null> {
  return withServiceTx((q) => loadBillingRowIn(q, businessId));
}

/**
 * Skapar Stripe-kunden en gång (idempotensnyckel `customer:<business_id>`)
 * och sparar id:t innan något annat anrop. Namn = företagets namn, e-post =
 * ägarens (för Stripes kvitton/fakturor).
 */
export async function ensureCustomer(
  businessId: string,
  email: string | null,
): Promise<string> {
  const existing = await loadBillingRow(businessId);
  if (existing) return existing.stripe_customer_id;
  const name = await withServiceTx(async (q) => {
    const r = await q.query<{ name: string }>(
      `select name from public.businesses where id = $1`,
      [businessId],
    );
    return r.rows[0]?.name ?? "";
  });
  const customer = await getStripe().customers.create(
    {
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
      preferred_locales: ["sv"],
      metadata: { business_id: businessId },
    },
    { idempotencyKey: `customer:${businessId}` },
  );
  return withServiceTx(async (q) => {
    await q.query(
      `insert into public.billing_subscriptions (business_id, stripe_customer_id)
       values ($1, $2)
       on conflict (business_id) do nothing`,
      [businessId, customer.id],
    );
    const row = await loadBillingRowIn(q, businessId);
    return row!.stripe_customer_id;
  });
}

/** Planens nuvarande läge enligt `businesses` (för spärrarna i actions). */
export async function businessPlanState(
  businessId: string,
): Promise<{ plan: string; overrideUntil: Date | null }> {
  return withServiceTx(async (q) => {
    const r = await q.query<{ plan: string; plan_override_until: Date | null }>(
      `select plan::text as plan, plan_override_until
         from public.businesses where id = $1`,
      [businessId],
    );
    return {
      plan: r.rows[0]?.plan ?? "free",
      overrideUntil: r.rows[0]?.plan_override_until ?? null,
    };
  });
}

export const LIVE_STATUSES = new Set([
  "trialing",
  "active",
  "past_due",
  "incomplete",
]);
