import "server-only";

import { withServiceTx } from "@/server/db/tx";
import { getStripe } from "@/server/payments/stripe/client";

/**
 * WP-76 (D-053): `charge.refunded` på plattformens konto. Laddningen hämtas
 * från Stripes API; köpet hittas via PaymentIntent. Återbetalt belopp räknas
 * om till krediter kumulativt (`floor(amount_refunded × credits / total)`), så
 * delåterbetalningar och omleveranser blir rätt. Bara oförbrukade krediter
 * dras (`private.sms_credit_refund`); saldot blir aldrig negativt.
 */
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
  // Bara plattformens egna sms-köp (Connect-betalningar har ingen `kind`).
  if (!pi || pi.metadata?.kind !== "sms_credits") return 0;
  const businessId = pi.metadata.business_id ?? "";
  return withServiceTx(async (q) => {
    const r = await q.query<{
      id: string;
      credits_total: number;
      amount_total: number;
    }>(
      `select id, credits_total, amount_total
         from public.sms_credit_purchases
        where business_id = $1 and stripe_payment_intent_id = $2`,
      [businessId, pi.id],
    );
    const row = r.rows[0];
    if (!row || row.amount_total <= 0) return 0;
    const refundedCredits = Math.floor(
      (Math.min(charge.amount_refunded, row.amount_total) * row.credits_total) /
        row.amount_total,
    );
    const v = await q.query<{ n: number }>(
      `select private.sms_credit_refund($1, $2) as n`,
      [row.id, refundedCredits],
    );
    return v.rows[0]?.n ?? 0;
  });
}
