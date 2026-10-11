import "server-only";

import { withServiceTx } from "@/server/db/tx";

import { isStripeInvoiceUrl } from "./config";

/**
 * WP-78 (D-059): misslyckad betalning och säkerhetsnätet.
 *  - `invoice.payment_failed` / `invoice.payment_action_required` → mejl till
 *    ägaren via `message_outbox` (regel 4), en gång per faktura.
 *  - `runBillingSweep` (cron, outbox-passet): past_due efter grace → Gratis,
 *    pilotdatum (`plan_override_until`) passerat → Gratis eller abonnemangets
 *    plan, påminnelser 14 och 3 dagar innan. Allt i `private.billing_sweep`.
 * Ingen data raderas vid nedgradering (D-048).
 */

export async function enqueuePaymentFailedEmail(input: {
  businessId: string;
  invoiceId: string;
  /** `action` = kortet kräver bekräftelse (3-D Secure), länk till fakturan. */
  kind: "failed" | "action";
  hostedInvoiceUrl: string | null;
}): Promise<void> {
  await withServiceTx(async (q) => {
    await q.query(
      `insert into public.message_outbox
         (business_id, booking_id, channel, recipient_kind, template, payload,
          category, dedupe_key)
       select s.business_id, null, 'email', 'owner',
              'abonnemangBetalningMisslyckades',
              jsonb_build_object(
                'plan', s.plan::text,
                'hasta', s.grace_until,
                'facturaUrl', $3::text),
              'utility', $4
         from public.billing_subscriptions s
        where s.business_id = $1 and s.plan is not null
       on conflict (dedupe_key) do nothing`,
      [
        input.businessId,
        input.invoiceId,
        isStripeInvoiceUrl(input.hostedInvoiceUrl)
          ? input.hostedInvoiceUrl
          : null,
        `billing_${input.kind}:${input.invoiceId}`,
      ],
    );
  });
}

export type BillingSweepResult = {
  graceExpired: number;
  pilotsEnded: number;
  pilotReminders: number;
};

export async function runBillingSweep(now: Date): Promise<BillingSweepResult> {
  return withServiceTx(async (q) => {
    const r = await q.query<{
      grace_expired: number;
      pilots_ended: number;
      pilot_reminders: number;
    }>(`select * from private.billing_sweep($1)`, [now]);
    const row = r.rows[0];
    return {
      graceExpired: row?.grace_expired ?? 0,
      pilotsEnded: row?.pilots_ended ?? 0,
      pilotReminders: row?.pilot_reminders ?? 0,
    };
  });
}
