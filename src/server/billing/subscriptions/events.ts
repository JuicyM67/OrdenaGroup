import "server-only";

import type Stripe from "stripe";

import { withServiceTx } from "@/server/db/tx";
import { getStripe } from "@/server/payments/stripe/client";

import { enqueuePaymentFailedEmail } from "./dunning";
import { syncSubscription } from "./sync";

/**
 * WP-78 (D-059): abonnemangets del av Stripe-webhooken (plattformens
 * händelser, inget `account`). Anropas av `webhook.ts` efter signaturkontroll
 * och `inbound_events`. Returnerar `true` om händelsen tillhör abonnemangen
 * (och är hanterad), `false` annars — då går den vidare till sms-krediterna
 * (D-053). Checkout-sessioner routas på `metadata.kind` HÄMTAT från API:t, så
 * att ett sms-köp aldrig tolkas som ett abonnemang och tvärtom.
 */

const SUBSCRIPTION_EVENTS = new Set<string>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.trial_will_end",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
]);

const SCHEDULE_EVENTS = new Set<string>([
  "subscription_schedule.updated",
  "subscription_schedule.released",
  "subscription_schedule.completed",
  "subscription_schedule.canceled",
]);

const INVOICE_EVENTS = new Set<string>([
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
]);

function idOf(x: string | { id: string } | null | undefined): string | null {
  if (!x) return null;
  return typeof x === "string" ? x : x.id;
}

function invoiceSubscriptionId(inv: Stripe.Invoice): string | null {
  return idOf(inv.parent?.subscription_details?.subscription ?? null);
}

async function handleCheckout(
  type: "completed" | "expired",
  sessionId: string,
  eventId: string,
): Promise<boolean> {
  const s = await getStripe().checkout.sessions.retrieve(sessionId);
  if (s.metadata?.kind !== "subscription") return false;
  const businessId = s.metadata.business_id ?? "";
  if (type === "expired") {
    await withServiceTx((q) =>
      q.query(
        `update public.billing_subscriptions
            set open_checkout_session_id = null, open_checkout_expires_at = null
          where business_id = $1 and open_checkout_session_id = $2`,
        [businessId, s.id],
      ),
    );
    return true;
  }
  const subId = idOf(s.subscription);
  if (subId) await syncSubscription(subId, { eventId });
  // Frivilligt organisationsnummer → fakturafält på kunden (syns på Stripes
  // fakturor). Bara siffror och bindestreck.
  const orgnr = s.custom_fields
    ?.find((f) => f.key === "orgnr")
    ?.text?.value?.trim();
  const customerId = idOf(s.customer);
  if (customerId && orgnr && /^[0-9-]{10,13}$/.test(orgnr)) {
    await getStripe().customers.update(customerId, {
      invoice_settings: {
        custom_fields: [{ name: "Org.nr", value: orgnr }],
      },
    });
  }
  return true;
}

export async function handleSubscriptionEvent(
  event: Stripe.Event,
): Promise<boolean> {
  if (event.account) return false;
  const obj = event.data.object as unknown as { id?: string };
  if (!obj.id) return false;

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    return handleCheckout("completed", obj.id, event.id);
  }
  if (event.type === "checkout.session.expired") {
    return handleCheckout("expired", obj.id, event.id);
  }
  if (SUBSCRIPTION_EVENTS.has(event.type)) {
    await syncSubscription(obj.id, { eventId: event.id });
    return true;
  }
  if (SCHEDULE_EVENTS.has(event.type)) {
    const sched = await getStripe().subscriptionSchedules.retrieve(obj.id);
    const subId = idOf(sched.subscription) ?? sched.released_subscription;
    if (subId) await syncSubscription(subId, { eventId: event.id });
    return true;
  }
  if (INVOICE_EVENTS.has(event.type)) {
    const inv = await getStripe().invoices.retrieve(obj.id);
    const subId = invoiceSubscriptionId(inv);
    // Fakturor utan abonnemang (sms-krediternas `invoice_creation`,
    // manuella fakturor för Skräddarsytt) rör inte abonnemangen.
    if (!subId) return true;
    const r = await syncSubscription(subId, { eventId: event.id });
    if (
      (event.type === "invoice.payment_failed" ||
        event.type === "invoice.payment_action_required") &&
      "businessId" in r &&
      // Bara förnyelser (abonnemanget blev past_due). En misslyckad
      // uppgradering (`pending_if_incomplete`) visas direkt i appen.
      r.subscriptionStatus === "past_due" &&
      inv.status === "open"
    ) {
      await enqueuePaymentFailedEmail({
        businessId: r.businessId,
        invoiceId: inv.id ?? obj.id,
        kind: event.type === "invoice.payment_failed" ? "failed" : "action",
        hostedInvoiceUrl:
          event.type === "invoice.payment_action_required"
            ? (inv.hosted_invoice_url ?? null)
            : null,
      });
    }
    return true;
  }
  return false;
}
