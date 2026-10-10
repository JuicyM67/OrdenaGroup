import "server-only";

import Stripe from "stripe";

import { market } from "@/config/brand";

/**
 * WP-64 (D-044): Stripe-klienten. Hemligheter läses bara härifrån (env, aldrig
 * klientkod eller loggar). Saknas `STRIPE_SECRET_KEY` är hela funktionen
 * avstängd: ingen flik, ingen betalning i bokningsflödet, webhooken svarar 503.
 * Bara SE-installationen (Chile: Mercado Pago kommer senare, D-035).
 */
export function stripeSecretKey(): string | null {
  const k = process.env.STRIPE_SECRET_KEY?.trim();
  return k ? k : null;
}

/** Webhook-hemligheterna (plattformens och Connect-endpointens). */
export function stripeWebhookSecrets(): string[] {
  return [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
  ]
    .map((s) => s?.trim())
    .filter((s): s is string => !!s);
}

/** Funktionen finns på den här installationen (SE + nyckel satt). */
export function stripeEnabled(): boolean {
  return market === "SE" && stripeSecretKey() !== null;
}

let cached: Stripe | undefined;

export function getStripe(): Stripe {
  const key = stripeSecretKey();
  if (!key) throw new Error("stripe_not_configured");
  cached ??= new Stripe(key, { maxNetworkRetries: 2, timeout: 15_000 });
  return cached;
}

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000").replace(
    /\/$/,
    "",
  );
}
