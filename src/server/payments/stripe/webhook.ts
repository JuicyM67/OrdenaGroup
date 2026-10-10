import "server-only";

import Stripe from "stripe";

import {
  expireSmsCreditCheckout,
  fulfillSmsCreditCheckout,
  refundSmsCreditsForCharge,
} from "@/server/billing/sms-credits";
import { withServiceTx } from "@/server/db/tx";

import { syncAccount } from "./accounts";
import { getStripe } from "./client";
import { handleCheckoutExpired } from "./checkout";
import {
  handleChargeRefunded,
  handleCheckoutCompleted,
  handlePaymentCanceled,
  reconcileByPaymentIntent,
} from "./reconcile";

/**
 * WP-64 (D-044): Stripe-webhooken (plattformens och Connect-endpointens
 * händelser).
 *
 *  1. Signaturen verifieras över RÅ body (`constructEvent`: HMAC-SHA256 med
 *     tidsbegränsning och konstant-tids-jämförelse) mot varje konfigurerad hemlighet.
 *  2. Händelsen sparas i `inbound_events` (provider, event_id) FÖRE hanteringen
 *     (idempotens, INV-2). En redan hanterad händelse ignoreras.
 *  3. Betalningsdata i payloaden används aldrig: hanterarna hämtar sessionen,
 *     PaymentIntent, kontot och charge från Stripes API. Payloaden ger bara
 *     "vad hände" och vilka id:n.
 *  4. Ett fel ger 500 så att Stripe skickar igen; `processed_at` sätts först när
 *     hanteringen lyckats och alla hanterare är idempotenta.
 */

export function verifyStripeEvent(
  rawBody: string,
  signatureHeader: string,
  secrets: readonly string[],
): Stripe.Event | null {
  for (const secret of secrets) {
    try {
      return Stripe.webhooks.constructEvent(rawBody, signatureHeader, secret);
    } catch {
      // prova nästa hemlighet
    }
  }
  return null;
}

/** Sparar händelsen; `false` om den redan är hanterad. */
async function claimEvent(event: Stripe.Event): Promise<boolean> {
  return withServiceTx(async (q) => {
    const ins = await q.query(
      `insert into public.inbound_events (provider, event_id, payload)
       values ('stripe', $1, $2::jsonb)
       on conflict (provider, event_id) do nothing
       returning event_id`,
      [
        event.id,
        JSON.stringify({ type: event.type, account: event.account ?? null }),
      ],
    );
    if (ins.rows.length > 0) return true;
    const done = await q.query<{ processed_at: Date | null }>(
      `select processed_at from public.inbound_events
        where provider = 'stripe' and event_id = $1`,
      [event.id],
    );
    return done.rows[0]?.processed_at == null;
  });
}

async function markProcessed(event: Stripe.Event): Promise<void> {
  await withServiceTx(async (q) => {
    await q.query(
      `update public.inbound_events set processed_at = now()
        where provider = 'stripe' and event_id = $1`,
      [event.id],
    );
  });
}

function idOf(x: string | { id: string } | null | undefined): string | null {
  if (!x) return null;
  return typeof x === "string" ? x : x.id;
}

async function dispatch(event: Stripe.Event, now: Date): Promise<void> {
  const account = event.account ?? null;
  const obj = event.data.object as unknown as { id?: string };
  switch (event.type) {
    case "account.updated": {
      if (account) await syncAccount(account);
      return;
    }
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      if (!obj.id) return;
      // WP-76 (D-053): plattformens egna händelser (inget `account`) =
      // sms-krediter; `fulfill` kräver `metadata.kind === "sms_credits"`
      // hämtat från API:t och ignorerar allt annat.
      if (!account) {
        await fulfillSmsCreditCheckout(obj.id, { now });
        return;
      }
      await handleCheckoutCompleted(obj.id, account, now);
      return;
    }
    case "checkout.session.expired": {
      if (!obj.id) return;
      if (!account) {
        await expireSmsCreditCheckout(obj.id);
        return;
      }
      const s = await getStripe().checkout.sessions.retrieve(
        obj.id,
        {},
        { stripeAccount: account },
      );
      if (s.status === "expired") await handleCheckoutExpired(obj.id, now);
      return;
    }
    case "payment_intent.succeeded":
    case "payment_intent.amount_capturable_updated": {
      if (account && obj.id)
        await reconcileByPaymentIntent(obj.id, account, now);
      return;
    }
    case "payment_intent.canceled": {
      if (!account || !obj.id) return;
      const pi = await getStripe().paymentIntents.retrieve(
        obj.id,
        {},
        { stripeAccount: account },
      );
      if (pi.status === "canceled") await handlePaymentCanceled(pi.id);
      return;
    }
    case "charge.refunded": {
      if (!account) {
        if (obj.id) await refundSmsCreditsForCharge(obj.id);
        return;
      }
      const pi = idOf(
        (event.data.object as { payment_intent?: string | null })
          .payment_intent,
      );
      if (account && pi) await handleChargeRefunded(pi, account);
      return;
    }
    // payment_intent.payment_failed: kunden kan försöka igen i samma session;
    // slutresultatet kommer som completed/expired. Sparas bara i inbound_events.
    default:
      return;
  }
}

export type StripeEventOutcome = "handled" | "duplicate";

export async function processStripeEvent(
  event: Stripe.Event,
  now: Date,
): Promise<StripeEventOutcome> {
  if (!(await claimEvent(event))) return "duplicate";
  await dispatch(event, now);
  await markProcessed(event);
  return "handled";
}
