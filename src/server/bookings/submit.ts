import "server-only";

import { withServiceTx } from "@/server/db/tx";
import type { Result } from "@/server/scheduling/result";

import { createBooking } from "./create";
import type { BookingError, CreatedBooking } from "./types";

export type SubmitBookingInput = {
  businessId: string;
  serviceId: string;
  staffId: string;
  /** ISO-instant (kommer direkt från `BookingSlot.id`, se page-data.ts). */
  start: string;
  name: string;
  phone: string;
  email?: string | undefined;
  marketing: boolean;
  consentVersion: string;
  now: Date;
};

/**
 * Kundens bokning från `/{slug}` (WP-20): anropar motorns `createBooking`
 * och sparar sedan samtycket på kundraden i en egen transaktion.
 *
 * Känd begränsning (dokumenterad i docs/tasks/plans/WP-20.md): de två
 * skrivningarna är inte atomiska. Om processen kraschar mellan dem finns
 * bokningen men inte samtycket — en fullständig samtyckeslogg och
 * atomicitet hör till WP-26 (se WP-10-planen, FRÅGA 8). Motorns egen
 * transaktion (bokning + kund) är alltid atomisk.
 */
export async function submitCustomerBooking(
  input: SubmitBookingInput,
): Promise<Result<CreatedBooking, BookingError>> {
  const result = await createBooking(
    {
      serviceId: input.serviceId,
      staffId: input.staffId,
      start: input.start,
      customer: {
        phone: input.phone,
        name: input.name,
        email: input.email,
      },
    },
    {
      businessId: input.businessId,
      actor: { kind: "customer" },
      now: input.now,
    },
  );
  if (!result.ok) return result;

  const nowIso = input.now.toISOString();
  await withServiceTx(async (q) => {
    await q.query(
      `update public.customers
          set consent_terms_at = $3,
              consent_marketing_at = $4,
              consent_version = $5,
              consent_channel = 'web'
        where business_id = $1 and id = $2`,
      [
        input.businessId,
        result.value.customerId,
        nowIso,
        input.marketing ? nowIso : null,
        input.consentVersion,
      ],
    );
  });

  return result;
}
