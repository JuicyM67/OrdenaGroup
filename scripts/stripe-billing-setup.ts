// WP-78 (D-059): skapar/uppdaterar Stripe-objekten för abonnemangen på
// PLATTFORMENS konto, idempotent, per miljö (testläge och liveläge var för sig):
//   1. Produkter (metadata.plan = emprende|equipo|local) och månadspriser i SEK,
//      exklusive moms, med lookup_key `bb_se_<plan>_monthly_v<n>`. Beloppen
//      läses från `src/config/pricing.ts` (SE). Finns nyckeln redan med ett
//      annat belopp avbryts skriptet: höj PRICE_VERSION i
//      `src/server/billing/subscriptions/config.ts` (befintliga abonnemang
//      ligger kvar på sitt gamla pris — Stripes standard).
//   2. Skattesats 25 % exklusiv (om varken STRIPE_VAT_RATE_ID eller
//      STRIPE_SMS_VAT_RATE_ID är satt och ingen sådan finns).
//   3. Customer Portal-konfiguration: kort, faktureringsuppgifter, fakturor,
//      uppsägning vid periodens slut. PLANBYTE AV (görs i appen).
// Skriver ut env-variablerna som ska sättas. Ingen nyckel i repo.
//
// Körs av en MÄNNISKA (regel hård 8), aldrig av en agent:
//   STRIPE_SECRET_KEY=sk_test_... NEXT_PUBLIC_APP_URL=https://... \
//   npx tsx scripts/stripe-billing-setup.ts
// Liveläge kräver dessutom flaggan --live.
import Stripe from "stripe";

import { precioPlan } from "@/config/pricing";

const PLANS = ["emprende", "equipo", "local"] as const;
type Plan = (typeof PLANS)[number];

/** Samma värde som PRICE_VERSION i src/server/billing/subscriptions/config.ts. */
const PRICE_VERSION = 1;
const APP_TAG = "bb_billing";

/** Visningsnamn i Stripe (kvitton/fakturor). Speglar planes.nombres i sv-SE. */
const PRODUCT_NAMES: Record<Plan, string> = {
  emprende: "Plan Starta",
  equipo: "Plan Team",
  local: "Plan Företag",
};

const lookupKey = (plan: Plan) => `bb_se_${plan}_monthly_v${PRICE_VERSION}`;

async function ensureProduct(stripe: Stripe, plan: Plan): Promise<string> {
  for await (const p of stripe.products.list({ limit: 100 })) {
    if (p.metadata?.app === APP_TAG && p.metadata?.plan === plan) {
      if (!p.active) await stripe.products.update(p.id, { active: true });
      return p.id;
    }
  }
  const created = await stripe.products.create(
    {
      name: PRODUCT_NAMES[plan],
      metadata: { app: APP_TAG, plan },
      tax_code: "txcd_10103001", // SaaS, business use
    },
    { idempotencyKey: `bb_billing_product_${plan}` },
  );
  return created.id;
}

async function ensurePrice(
  stripe: Stripe,
  plan: Plan,
  productId: string,
): Promise<string> {
  const amount = precioPlan(plan, "SE");
  const key = lookupKey(plan);
  const existing = await stripe.prices.list({ lookup_keys: [key], limit: 1 });
  const found = existing.data[0];
  if (found) {
    if (
      found.unit_amount !== amount ||
      found.currency !== "sek" ||
      found.recurring?.interval !== "month" ||
      found.tax_behavior !== "exclusive"
    ) {
      throw new Error(
        `Priset ${key} finns med ett annat belopp (${String(found.unit_amount)} öre, pricing.ts säger ${amount}). Höj PRICE_VERSION och kör igen.`,
      );
    }
    if (!found.active) await stripe.prices.update(found.id, { active: true });
    return found.id;
  }
  const price = await stripe.prices.create({
    product: productId,
    currency: "sek",
    unit_amount: amount,
    recurring: { interval: "month" },
    tax_behavior: "exclusive",
    lookup_key: key,
    transfer_lookup_key: true,
    metadata: { app: APP_TAG, plan },
  });
  return price.id;
}

async function ensureVatRate(stripe: Stripe): Promise<string> {
  const configured =
    process.env.STRIPE_VAT_RATE_ID?.trim() ||
    process.env.STRIPE_SMS_VAT_RATE_ID?.trim();
  if (configured) {
    const tr = await stripe.taxRates.retrieve(configured);
    if (!tr.active || tr.inclusive || tr.percentage !== 25) {
      throw new Error(
        `Skattesatsen ${configured} är inte 25 % exklusiv och aktiv.`,
      );
    }
    return tr.id;
  }
  for await (const tr of stripe.taxRates.list({ active: true, limit: 100 })) {
    if (!tr.inclusive && tr.percentage === 25 && tr.country === "SE")
      return tr.id;
  }
  const tr = await stripe.taxRates.create({
    display_name: "Moms",
    percentage: 25,
    inclusive: false,
    country: "SE",
    tax_type: "vat",
    description: "Moms 25 %",
  });
  return tr.id;
}

async function ensurePortal(
  stripe: Stripe,
  returnUrl: string,
): Promise<string> {
  const features: Stripe.BillingPortal.ConfigurationCreateParams.Features = {
    customer_update: {
      enabled: true,
      allowed_updates: ["name", "email", "address", "tax_id"],
    },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true, mode: "at_period_end" },
    // Planbyten görs i appen (D-059).
    subscription_update: { enabled: false },
  };
  const existing = process.env.STRIPE_BILLING_PORTAL_CONFIG_ID?.trim();
  if (existing) {
    const c = await stripe.billingPortal.configurations.update(existing, {
      features,
      default_return_url: returnUrl,
      active: true,
    });
    return c.id;
  }
  const c = await stripe.billingPortal.configurations.create({
    features,
    default_return_url: returnUrl,
    metadata: { app: APP_TAG },
  });
  return c.id;
}

async function main(): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY saknas.");
  const live = key.startsWith("sk_live_") || key.startsWith("rk_live_");
  if (live && !process.argv.includes("--live")) {
    throw new Error("Live-nyckel: kör bara med --live (och bara av ägaren).");
  }
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (
    !appUrl.startsWith("https://") &&
    !appUrl.startsWith("http://localhost")
  ) {
    throw new Error("NEXT_PUBLIC_APP_URL saknas (https://…).");
  }
  const stripe = new Stripe(key, { maxNetworkRetries: 2 });

  for (const plan of PLANS) {
    const product = await ensureProduct(stripe, plan);
    const price = await ensurePrice(stripe, plan, product);
    console.log(
      `${plan}: ${lookupKey(plan)} → ${price} (${precioPlan(plan, "SE") / 100} kr exkl. moms)`,
    );
  }
  const vat = await ensureVatRate(stripe);
  const portal = await ensurePortal(stripe, `${appUrl}/app/installningar/plan`);

  console.log(`\nSätt i miljön (${live ? "LIVE" : "test"}):`);
  console.log(`STRIPE_VAT_RATE_ID=${vat}`);
  console.log(`STRIPE_BILLING_PORTAL_CONFIG_ID=${portal}`);
  console.log(
    "\nPlattformens webhook (/api/webhooks/stripe) ska dessutom prenumerera på:\n" +
      [
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "customer.subscription.paused",
        "customer.subscription.resumed",
        "customer.subscription.trial_will_end",
        "customer.subscription.pending_update_applied",
        "customer.subscription.pending_update_expired",
        "subscription_schedule.updated",
        "subscription_schedule.released",
        "subscription_schedule.completed",
        "subscription_schedule.canceled",
        "invoice.paid",
        "invoice.payment_failed",
        "invoice.payment_action_required",
      ]
        .map((e) => `  - ${e}`)
        .join("\n"),
  );
}

main().catch((e: unknown) => {
  console.error(
    "stripe-billing-setup misslyckades:",
    e instanceof Error ? e.message : "okänt fel",
  );
  process.exit(1);
});
