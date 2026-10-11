import "server-only";

import type Stripe from "stripe";

import { getStripe } from "@/server/payments/stripe/client";

import {
  handleGiftCardCheckoutEvent,
  handleGiftCardPaymentEvent,
} from "./checkout";

function idOf(x: string | { id: string } | null | undefined): string | null {
  if (!x) return null;
  return typeof x === "string" ? x : x.id;
}

/**
 * WP-77 (D-058): presentkortets del av Stripe-webhooken (Connect-händelser,
 * `event.account` satt). Anropas FÖRST i `dispatch` (en rad i
 * `src/server/payments/stripe/webhook.ts`); `true` = händelsen gällde ett
 * presentkort och är hanterad, `false` = inte vår (nästa hanterare som förut).
 * Ordern slås upp på session/PaymentIntent i databasen; all betalningsdata
 * hämtas från Stripes API (D-044 p. 7).
 */
export async function dispatchGiftCardEvent(
  event: Stripe.Event,
  now: Date,
): Promise<boolean> {
  const account = event.account ?? null;
  if (!account) return false;
  const obj = event.data.object as unknown as {
    id?: string;
    payment_intent?: string | { id: string } | null;
  };
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return obj.id
        ? handleGiftCardCheckoutEvent("completed", obj.id, account, now)
        : false;
    case "checkout.session.expired":
      return obj.id
        ? handleGiftCardCheckoutEvent("expired", obj.id, account, now)
        : false;
    case "charge.refunded": {
      const pi = idOf(obj.payment_intent);
      return pi
        ? handleGiftCardPaymentEvent("refunded", pi, account, now)
        : false;
    }
    case "charge.dispute.created": {
      if (!obj.id) return false;
      const dispute = await getStripe().disputes.retrieve(
        obj.id,
        {},
        { stripeAccount: account },
      );
      const pi = idOf(dispute.payment_intent);
      return pi
        ? handleGiftCardPaymentEvent("disputed", pi, account, now)
        : false;
    }
    case "charge.dispute.closed": {
      // Vunnen tvist: spärren hävs (pengarna är kvar hos salongen).
      if (!obj.id) return false;
      const dispute = await getStripe().disputes.retrieve(
        obj.id,
        {},
        { stripeAccount: account },
      );
      const pi = idOf(dispute.payment_intent);
      if (!pi) return false;
      if (dispute.status !== "won") {
        // Förlorad tvist: kortet förblir spärrat (idempotent).
        return handleGiftCardPaymentEvent("disputed", pi, account, now);
      }
      return handleGiftCardPaymentEvent("dispute_won", pi, account, now);
    }
    default:
      return false;
  }
}
