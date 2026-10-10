import "server-only";

import type Stripe from "stripe";

import { withServiceTx } from "@/server/db/tx";
import { getStripe } from "@/server/payments/stripe/client";

/**
 * WP-76 (D-053): krediterar ett köp efter VERIFIERAD betalning. Sessionen
 * hämtas alltid från Stripes API (payloaden i webhooken litas aldrig på,
 * D-044 punkt 7). Kräver `metadata.kind === "sms_credits"`, `payment_status
 * === "paid"` och att belopp, valuta, köp-id och företag stämmer med raden i
 * databasen. Idempotent (`private.sms_credit_grant`): webhooken och
 * retursidan kan båda anropa den.
 */

export type FulfillOutcome =
  | { status: "granted" | "already"; credits: number; businessId: string }
  | { status: "pending" | "ignored" | "mismatch" | "forbidden" };

type PurchaseRow = {
  business_id: string;
  amount_total: number;
  currency: string;
  credits_total: number;
  status: string;
  stripe_checkout_session_id: string | null;
};

function idOf(x: string | { id: string } | null | undefined): string | null {
  if (!x) return null;
  return typeof x === "string" ? x : x.id;
}

function isSmsSession(s: Stripe.Checkout.Session): boolean {
  return s.metadata?.kind === "sms_credits";
}

export async function fulfillSmsCreditCheckout(
  sessionId: string,
  opts: { expectBusinessId?: string; now?: Date } = {},
): Promise<FulfillOutcome> {
  const stripe = getStripe();
  const s = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent.latest_charge"],
  });
  if (!isSmsSession(s)) return { status: "ignored" };
  const purchaseId = s.metadata?.purchase_id ?? "";
  const businessId = s.metadata?.business_id ?? "";
  if (opts.expectBusinessId && opts.expectBusinessId !== businessId) {
    return { status: "forbidden" };
  }
  if (s.payment_status !== "paid") return { status: "pending" };

  const pi =
    s.payment_intent && typeof s.payment_intent !== "string"
      ? s.payment_intent
      : null;
  const charge =
    pi?.latest_charge && typeof pi.latest_charge !== "string"
      ? pi.latest_charge
      : null;
  const receiptUrl = charge?.receipt_url ?? null;

  return withServiceTx(async (q) => {
    const r = await q.query<PurchaseRow>(
      `select business_id, amount_total, currency, credits_total, status,
              stripe_checkout_session_id
         from public.sms_credit_purchases
        where id = $1 and business_id = $2
        for update`,
      [purchaseId, businessId],
    );
    const row = r.rows[0];
    if (
      !row ||
      (row.stripe_checkout_session_id !== null &&
        row.stripe_checkout_session_id !== s.id) ||
      row.amount_total !== s.amount_total ||
      row.currency !== s.currency
    ) {
      return { status: "mismatch" as const };
    }
    const granted = await q.query<{ ok: boolean }>(
      `select private.sms_credit_grant($1, $2, $3) as ok`,
      [purchaseId, idOf(s.payment_intent), opts.now ?? new Date()],
    );
    await q.query(
      `update public.sms_credit_purchases
          set stripe_checkout_session_id = coalesce(stripe_checkout_session_id, $3),
              receipt_url = coalesce(receipt_url, $4)
        where id = $1 and business_id = $2`,
      [
        purchaseId,
        businessId,
        s.id,
        receiptUrl?.startsWith("https://") ? receiptUrl : null,
      ],
    );
    return {
      status: granted.rows[0]?.ok ? ("granted" as const) : ("already" as const),
      credits: row.credits_total,
      businessId,
    };
  });
}

/** `checkout.session.expired`: köpet stängs om det fortfarande väntar. */
export async function expireSmsCreditCheckout(
  sessionId: string,
): Promise<void> {
  const s = await getStripe().checkout.sessions.retrieve(sessionId);
  if (!isSmsSession(s) || s.status !== "expired") return;
  await withServiceTx((q) =>
    q.query(
      `update public.sms_credit_purchases
          set status = 'expired_checkout'
        where id = $1 and business_id = $2 and status = 'pending'`,
      [s.metadata?.purchase_id ?? "", s.metadata?.business_id ?? ""],
    ),
  );
}
