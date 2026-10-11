import "server-only";

import type Stripe from "stripe";

import type { PaidPlan } from "@/lib/validation/billing";
import { hitRateLimit } from "@/server/db/rate-limit";
import { withServiceTx } from "@/server/db/tx";
import { getStripe } from "@/server/payments/stripe/client";

import { planForLookupKey } from "./config";
import { loadBillingRow } from "./customer";
import { BillingError } from "./errors";

/**
 * WP-78 (D-059): speglar ett abonnemang i `billing_subscriptions` och
 * `businesses.plan`. Abonnemanget hämtas ALLTID från Stripes API (payloaden i
 * webhooken litas aldrig på). Kräver `metadata.kind === "subscription"`,
 * `metadata.business_id` och att kunden är samma som på företagets rad —
 * annars ett synligt fel (kod + id, ingen persondata). Själva regeln för
 * planen ligger i `private.billing_apply_subscription` (idempotent, ignorerar
 * äldre hämtningar), så webhooken, retursidan och actions kan alla anropa
 * den här funktionen samtidigt.
 */

export type SyncOutcome =
  | {
      status: "applied" | "stale" | "other";
      businessId: string;
      subscriptionStatus: string;
      plan: PaidPlan;
    }
  | { status: "ignored" | "forbidden" };

function idOf(x: string | { id: string } | null | undefined): string | null {
  if (!x) return null;
  return typeof x === "string" ? x : x.id;
}

function lookupOf(
  p: string | Stripe.Price | Stripe.DeletedPrice | null | undefined,
): string | null {
  if (!p || typeof p === "string" || "deleted" in p) return null;
  return p.lookup_key ?? null;
}

function cardOf(sub: Stripe.Subscription): {
  brand: string | null;
  last4: string | null;
} {
  const fromPm = (pm: unknown) => {
    if (!pm || typeof pm !== "object") return null;
    const card = (pm as Stripe.PaymentMethod).card;
    return card ? { brand: card.brand, last4: card.last4 } : null;
  };
  const own = fromPm(sub.default_payment_method);
  if (own) return own;
  const customer = sub.customer;
  if (customer && typeof customer !== "string" && !("deleted" in customer)) {
    const viaCustomer = fromPm(
      customer.invoice_settings?.default_payment_method,
    );
    if (viaCustomer) return viaCustomer;
  }
  return { brand: null, last4: null };
}

/** Nästa fas i en Subscription Schedule (nedgradering vid periodens slut). */
function pendingPlanOf(sub: Stripe.Subscription, now: number): PaidPlan | null {
  const sched = sub.schedule;
  if (!sched || typeof sched === "string") return null;
  if (sched.status !== "active" && sched.status !== "not_started") return null;
  const next = sched.phases.find((ph) => ph.start_date > now);
  const price = next?.items[0]?.price;
  return planForLookupKey(lookupOf(price));
}

export async function retrieveSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  return getStripe().subscriptions.retrieve(subscriptionId, {
    expand: [
      "default_payment_method",
      "customer.invoice_settings.default_payment_method",
      "schedule.phases.items.price",
    ],
  });
}

export async function syncSubscription(
  subscriptionId: string,
  opts: { eventId?: string; expectBusinessId?: string } = {},
): Promise<SyncOutcome> {
  // Tiden FÖRE hämtningen: en hämtning som startade tidigare har äldre data.
  const fetchedAt = new Date();
  const sub = await retrieveSubscription(subscriptionId);
  if (sub.metadata?.kind !== "subscription") return { status: "ignored" };
  const businessId = sub.metadata.business_id ?? "";
  if (!businessId) throw new BillingError("metadata_missing", sub.id);
  if (opts.expectBusinessId && opts.expectBusinessId !== businessId) {
    return { status: "forbidden" };
  }
  const customerId = idOf(sub.customer);
  const row = await loadBillingRow(businessId);
  if (!row) throw new BillingError("no_customer", sub.id);
  if (!customerId || row.stripe_customer_id !== customerId) {
    throw new BillingError("customer_mismatch", sub.id);
  }
  const item = sub.items.data[0];
  const lookupKey = lookupOf(item?.price);
  const plan = planForLookupKey(lookupKey);
  if (!item || !plan) throw new BillingError("unknown_price", sub.id);

  const card = cardOf(sub);
  const nowSec = Math.floor(fetchedAt.getTime() / 1000);
  const result = await withServiceTx(async (q) => {
    const r = await q.query<{ outcome: string }>(
      `select private.billing_apply_subscription(
         $1, $2, $3, $4::public.business_plan, $5, $6, $7, $8, $9,
         $10::public.business_plan, $11, $12, $13, $14) as outcome`,
      [
        businessId,
        customerId,
        sub.id,
        plan,
        lookupKey,
        sub.status,
        sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        item.current_period_end
          ? new Date(item.current_period_end * 1000)
          : null,
        sub.cancel_at_period_end || sub.cancel_at !== null,
        pendingPlanOf(sub, nowSec),
        card.brand,
        card.last4,
        fetchedAt,
        opts.eventId ?? null,
      ],
    );
    return r.rows[0]?.outcome ?? "applied";
  });
  // Dubbel Checkout (två flikar): databasen har avgjort under radlåset att
  // raden redan har ett annat levande abonnemang. Först nu sägs det nya upp.
  // Synligt fel (500 → Stripe skickar igen; då är det uppsagt och ignoreras).
  // Eventuell återbetalning görs manuellt i Stripe.
  if (result === "duplicate") {
    await getStripe().subscriptions.cancel(sub.id, { prorate: true });
    throw new BillingError("duplicate_subscription", sub.id);
  }
  return {
    status: result as "applied" | "stale" | "other",
    businessId,
    subscriptionStatus: sub.status,
    plan,
  };
}

/** Retursidan `?abonnemang=klart&session=…`: samma synk som webhooken. */
export async function syncFromCheckoutReturn(
  sessionId: string,
  businessId: string,
): Promise<"done" | "processing" | "forbidden"> {
  // Retursidan kan laddas om godtyckligt; begränsa Stripe-anropen.
  const allowed = await hitRateLimit({
    scope: "billing:return",
    subject: businessId,
    windowSeconds: 3600,
    max: 30,
  });
  if (!allowed) return "processing";
  const s = await getStripe().checkout.sessions.retrieve(sessionId);
  if (s.metadata?.kind !== "subscription") return "forbidden";
  if (s.metadata.business_id !== businessId) return "forbidden";
  const subId = idOf(s.subscription);
  if (!subId) return "processing";
  const r = await syncSubscription(subId, { expectBusinessId: businessId });
  if (r.status === "forbidden") return "forbidden";
  if (
    "subscriptionStatus" in r &&
    (r.subscriptionStatus === "trialing" || r.subscriptionStatus === "active")
  ) {
    return "done";
  }
  return "processing";
}
