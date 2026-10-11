import "server-only";

import { appHref } from "@/config/routes";
import {
  paidPlanSchema,
  type BillingActionResult,
} from "@/lib/validation/billing";
import { withServiceTx } from "@/server/db/tx";
import { appBaseUrl, getStripe } from "@/server/payments/stripe/client";

import { billingVatRateId, TRIAL_DAYS } from "./config";
import {
  businessPlanState,
  ensureCustomer,
  guardOwner,
  LIVE_STATUSES,
  loadBillingRow,
} from "./customer";
import { priceIdFor, vatRateValid } from "./prices";

/**
 * WP-78 (D-059): start av ett abonnemang via Stripe Checkout på PLATTFORMENS
 * konto (`mode: "subscription"`, inget `stripeAccount`). Första gången:
 * provperiod 14 dagar UTAN kort (`payment_method_collection: "if_required"`;
 * saknas kort när provet slutar sägs abonnemanget upp → Gratis). Pris-id
 * bestäms av servern ur lookup-nyckeln, aldrig från klienten. Planen ändras
 * först när webhooken/retursidan hämtat abonnemanget (`sync.ts`).
 */

/** Stripe kräver minst 30 min; vi tar 31 (som WP-64/WP-76). */
const SESSION_TTL_MINUTES = 31;

export async function startSubscriptionCheckout(input: {
  businessId: string;
  userId: string;
  email: string | null;
  plan: unknown;
  now?: Date;
}): Promise<BillingActionResult> {
  const parsed = paidPlanSchema.safeParse(input.plan);
  if (!parsed.success) return { ok: false, code: "billing_invalid_plan" };
  const plan = parsed.data;
  const denied = await guardOwner(input.userId, input.businessId);
  if (denied) return { ok: false, code: denied };

  const state = await businessPlanState(input.businessId);
  if (state.plan === "custom")
    return { ok: false, code: "billing_custom_plan" };

  const now = input.now ?? new Date();
  const row = await loadBillingRow(input.businessId);
  if (row?.status && LIVE_STATUSES.has(row.status)) {
    return { ok: false, code: "billing_already_subscribed" };
  }
  // Dubbelklick/två flikar: samma öppna session återanvänds.
  if (
    row?.open_checkout_session_id &&
    row.open_checkout_expires_at &&
    row.open_checkout_expires_at.getTime() > now.getTime() + 60_000
  ) {
    try {
      const open = await getStripe().checkout.sessions.retrieve(
        row.open_checkout_session_id,
      );
      if (open.status === "open" && open.url && open.metadata?.plan === plan) {
        return { ok: true, url: open.url };
      }
    } catch {
      // Hämtningen misslyckades: skapa en ny session nedan.
    }
  }

  const vatRate = billingVatRateId();
  if (!vatRate) return { ok: false, code: "billing_unavailable" };
  try {
    if (!(await vatRateValid(vatRate))) {
      return { ok: false, code: "billing_unavailable" };
    }
    const [customer, price] = await Promise.all([
      ensureCustomer(input.businessId, input.email),
      priceIdFor(plan),
    ]);
    const withTrial = !row?.trial_used_at;
    const base = `${appBaseUrl()}${appHref("appAjustesPlan")}`;
    const metadata = {
      kind: "subscription",
      business_id: input.businessId,
      plan,
    };
    const expiresAt =
      Math.floor(now.getTime() / 1000) + SESSION_TTL_MINUTES * 60;
    const session = await getStripe().checkout.sessions.create(
      {
        mode: "subscription",
        locale: "sv",
        customer,
        client_reference_id: input.businessId,
        line_items: [{ price, quantity: 1 }],
        subscription_data: {
          default_tax_rates: [vatRate],
          metadata: { kind: "subscription", business_id: input.businessId },
          ...(withTrial
            ? {
                trial_period_days: TRIAL_DAYS,
                trial_settings: {
                  end_behavior: { missing_payment_method: "cancel" },
                },
              }
            : {}),
        },
        ...(withTrial ? { payment_method_collection: "if_required" } : {}),
        metadata,
        billing_address_collection: "required",
        tax_id_collection: { enabled: true },
        // Frivilligt; sparas som fakturafält på kunden av webhooken.
        custom_fields: [
          {
            key: "orgnr",
            label: { type: "custom", custom: "Organisationsnummer" },
            type: "text",
            optional: true,
            text: { maximum_length: 20 },
          },
        ],
        customer_update: { name: "auto", address: "auto" },
        expires_at: expiresAt,
        success_url: `${base}?abonnemang=klart&session={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}?abonnemang=avbrutet`,
      },
      {
        idempotencyKey: `subscription_checkout:${input.businessId}:${plan}:${Math.floor(now.getTime() / 60_000)}`,
      },
    );
    if (!session.url) return { ok: false, code: "failed" };
    await withServiceTx((q) =>
      q.query(
        `update public.billing_subscriptions
            set open_checkout_session_id = $2,
                open_checkout_expires_at = to_timestamp($3)
          where business_id = $1`,
        [input.businessId, session.id, expiresAt],
      ),
    );
    return { ok: true, url: session.url };
  } catch {
    // Ingen persondata i loggar; bara att det misslyckades.
    console.error("billing: checkout misslyckades", {
      code: "checkout_failed",
    });
    return { ok: false, code: "failed" };
  }
}
