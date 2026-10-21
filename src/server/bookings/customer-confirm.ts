import "server-only";

import { withServiceTx } from "@/server/db/tx";

/**
 * D-063 (F7, WP-22): kunden svarade *Confirmo* på påminnelsen
 * `recordatorio_24h` i WhatsApp → `bookings.confirmed_by_customer_at`
 * (agendans "Confirmó"). Ändrar inget annat — bokningen är redan
 * `confirmed` av företaget; det här är bara kundens kvittens.
 *
 * Anropas bara av WhatsApp-webhooken, som redan har bundit svaret till vår
 * egen utkorgsrad (`context.id`) och kontrollerat att avsändaren är kundens
 * nummer — `businessId`/`bookingId` kommer därifrån, aldrig från
 * meddelandet. Idempotent (bara första gången räknas), och en bokning som
 * avbokats, flyttats till förfrågan eller redan passerat (`now`) ändras inte.
 */
export type CustomerConfirmResult = "confirmed" | "already" | "not_confirmable";

export async function confirmBookingByCustomer(input: {
  businessId: string;
  bookingId: string;
  now: Date;
}): Promise<CustomerConfirmResult> {
  return withServiceTx(async (q) => {
    const r = await q.query<{ id: string }>(
      `update public.bookings
          set confirmed_by_customer_at = $3
        where business_id = $1 and id = $2
          and status = 'confirmed'
          and confirmed_by_customer_at is null
          and lower(period) > $3`,
      [input.businessId, input.bookingId, input.now],
    );
    if ((r.rowCount ?? 0) === 1) return "confirmed";
    const b = await q.query<{ already: boolean }>(
      `select (confirmed_by_customer_at is not null) as already
         from public.bookings
        where business_id = $1 and id = $2`,
      [input.businessId, input.bookingId],
    );
    return b.rows[0]?.already ? "already" : "not_confirmable";
  });
}
