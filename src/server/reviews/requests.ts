import "server-only";

import { market } from "@/config/brand";
import { createManageToken } from "@/server/bookings/token";
import { withServiceTx } from "@/server/db/tx";
import { customerChannelsFor } from "@/server/messaging/outbox/enqueue";

/**
 * WP-65 (D-045): recensionsförfrågan. Ett svep i `/api/cron/outbox` (var 5:e
 * min, D-030) hittar bokningar som är genomförda — `completed` (Llegó) eller
 * `confirmed` vars tid gått ut utan att markeras No vino — och som slutade
 * för 2 h–3 dygn sedan. Per bokning: en `review_invites`-rad (bara token-
 * hashen, D-029) och `solicitudResena` i utkorgen (e-post om kunden har en;
 * SE även sms, samma kanalval som övriga kundmeddelanden). En gång per
 * bokning (`review_invites.booking_id` unik + dedupe_key), och högst en
 * förfrågan per kund och 14 dagar (stamkunder ska inte få ett mejl i veckan).
 * Svepets 3-dygnsgräns gör att funktionen inte skickar till gamla bokningar
 * när den slås på.
 */

const SEND_AFTER_HOURS = 2;
const MAX_AGE_HOURS = 72;
const PER_CUSTOMER_DAYS = 14;
const BATCH = 100;

type Candidate = {
  business_id: string;
  booking_id: string;
  customer_id: string;
  has_email: boolean;
};

export async function queueReviewRequests(now: Date): Promise<number> {
  return withServiceTx(async (q) => {
    const r = await q.query<Candidate>(
      `select bk.business_id, bk.id as booking_id, bk.customer_id,
              (c.email is not null) as has_email
         from public.bookings bk
         join public.businesses b on b.id = bk.business_id
         join public.customers c on c.business_id = bk.business_id and c.id = bk.customer_id
        where bk.status in ('confirmed', 'completed')
          and upper(bk.period) <= $1::timestamptz - make_interval(hours => $2::int)
          and upper(bk.period) > $1::timestamptz - make_interval(hours => $3::int)
          and b.review_requests_enabled
          and b.status = 'active'
          and c.anonymized_at is null
          and not exists (
            select 1 from public.review_invites ri
             where ri.business_id = bk.business_id and ri.booking_id = bk.id
          )
          and not exists (
            select 1
              from public.review_invites ri2
              join public.bookings bk2
                on bk2.business_id = ri2.business_id and bk2.id = ri2.booking_id
             where ri2.business_id = bk.business_id
               and bk2.customer_id = bk.customer_id
               and ri2.created_at > $1::timestamptz - make_interval(days => $4::int)
          )
        order by upper(bk.period)
        limit $5`,
      [
        now.toISOString(),
        SEND_AFTER_HOURS,
        MAX_AGE_HOURS,
        PER_CUSTOMER_DAYS,
        BATCH,
      ],
    );

    let queued = 0;
    const seenCustomers = new Set<string>();
    for (const c of r.rows) {
      // En kund med två bokningar i samma pass får bara en förfrågan.
      const key = `${c.business_id}:${c.customer_id}`;
      if (seenCustomers.has(key)) continue;
      seenCustomers.add(key);

      const channels = customerChannelsFor(market, c.has_email);
      if (channels.length === 0) continue;
      const { token, hash } = createManageToken();
      const inserted = await q.query(
        `insert into public.review_invites (business_id, booking_id, token_hash)
         values ($1, $2, $3)
         on conflict (booking_id) do nothing`,
        [c.business_id, c.booking_id, hash],
      );
      if (!inserted.rowCount) continue;
      for (const channel of channels) {
        await q.query(
          `insert into public.message_outbox
             (business_id, booking_id, channel, recipient_kind, template, payload,
              category, dedupe_key)
           values ($1, $2, $3, 'customer', 'solicitudResena', $4::jsonb, 'utility', $5)
           on conflict (dedupe_key) do nothing`,
          [
            c.business_id,
            c.booking_id,
            channel,
            JSON.stringify({ token }),
            `solicitudResena:${channel}:customer:${c.booking_id}:0`,
          ],
        );
      }
      queued += 1;
    }
    return queued;
  });
}
