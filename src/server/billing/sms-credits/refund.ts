import "server-only";

import type Stripe from "stripe";

import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";
import { getStripe } from "@/server/payments/stripe/client";

import { SmsCreditsError } from "./errors";

/**
 * WP-76 (D-053): återbetalning och tvist på plattformens konto. Laddningen /
 * tvisten hämtas från Stripes API; köpet hittas via PaymentIntentens
 * `metadata.purchase_id` + `business_id` (satta av `checkout.ts`). Är köpet
 * inte krediterat än (refund före grant) kastas felet så att webhooken svarar
 * 500 och Stripe skickar igen — annars skulle återbetalningen tappas.
 * Återbetalt belopp räknas om till krediter kumulativt
 * (`floor(amount_refunded × credits / total)`); bara oförbrukade krediter dras
 * (`private.sms_credit_refund`), saldot blir aldrig negativt.
 */

type PurchaseRef = { purchaseId: string; businessId: string };

function refOf(pi: Stripe.PaymentIntent | null): PurchaseRef | null {
  // Bara plattformens egna sms-köp (Connect-betalningar har ingen `kind`).
  if (!pi || pi.metadata?.kind !== "sms_credits") return null;
  const purchaseId = pi.metadata.purchase_id ?? "";
  const businessId = pi.metadata.business_id ?? "";
  if (!purchaseId || !businessId) {
    throw new SmsCreditsError("metadata_missing", purchaseId || pi.id);
  }
  return { purchaseId, businessId };
}

/** Drar krediter för `creditsRefundedTotal` (kumulativt) i anroparens transaktion. */
async function voidCreditsIn(
  q: Queryable,
  ref: PurchaseRef,
  toCredits: (row: { credits_total: number; amount_total: number }) => number,
): Promise<number> {
  const r = await q.query<{
    id: string;
    status: string;
    credits_total: number;
    amount_total: number;
  }>(
    `select id, status, credits_total, amount_total
       from public.sms_credit_purchases
      where id = $1 and business_id = $2
      for update`,
    [ref.purchaseId, ref.businessId],
  );
  const row = r.rows[0];
  if (!row) throw new SmsCreditsError("purchase_missing", ref.purchaseId);
  if (row.status === "pending" || row.status === "expired_checkout") {
    throw new SmsCreditsError("not_granted_yet", ref.purchaseId);
  }
  const v = await q.query<{ n: number }>(
    `select private.sms_credit_refund($1, $2) as n`,
    [row.id, toCredits(row)],
  );
  return v.rows[0]?.n ?? 0;
}

/** Kumulativ återbetalning (`charge.amount_refunded`, öre) → krediter. */
export function refundAmountIn(
  q: Queryable,
  ref: PurchaseRef,
  amountRefunded: number,
): Promise<number> {
  return voidCreditsIn(q, ref, (row) =>
    row.amount_total > 0
      ? Math.floor(
          (Math.min(Math.max(amountRefunded, 0), row.amount_total) *
            row.credits_total) /
            row.amount_total,
        )
      : 0,
  );
}

/** `charge.refunded` på plattformens konto. */
export async function refundSmsCreditsForCharge(
  chargeId: string,
): Promise<number> {
  const charge = await getStripe().charges.retrieve(chargeId, {
    expand: ["payment_intent"],
  });
  const pi =
    charge.payment_intent && typeof charge.payment_intent !== "string"
      ? charge.payment_intent
      : null;
  const ref = refOf(pi);
  if (!ref) return 0;
  return withServiceTx((q) => refundAmountIn(q, ref, charge.amount_refunded));
}

/** `charge.dispute.created` (chargeback) på plattformens konto: alla
 * återstående krediter i köpet dras direkt. Utfallet av tvisten hanteras
 * manuellt i Stripe Dashboard. */
export async function voidSmsCreditsForDispute(
  disputeId: string,
): Promise<number> {
  const dispute = await getStripe().disputes.retrieve(disputeId, {
    expand: ["payment_intent"],
  });
  const pi =
    dispute.payment_intent && typeof dispute.payment_intent !== "string"
      ? dispute.payment_intent
      : null;
  const ref = refOf(pi);
  if (!ref) return 0;
  return withServiceTx((q) =>
    voidCreditsIn(q, ref, (row) => row.credits_total),
  );
}
