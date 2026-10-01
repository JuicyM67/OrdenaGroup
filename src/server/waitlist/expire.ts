import "server-only";

import type { LocalDate } from "@/lib/format/dates";
import { withServiceTx } from "@/server/db/tx";

import { emitWaitlistEvents, type WaitlistEvent } from "./events";
import { loadWaitlistBusiness, offerWaitingIn } from "./match";

/** Högst så många per körning (cron var 5:e min); resten nästa gång. */
const EXPIRE_BATCH = 200;

export type ExpireWaitlistResult = { expired: number; offered: number };

/**
 * WP-23: svepet för cron (`/api/cron/outbox`, `systemClock()`). Varje
 * `offered` vars `offer_expires_at <= now` → `expired`. Sekventiellt läge:
 * nästa väntande i kön samma dag erbjuds (om tjänsten fortfarande har en
 * giltig tid). Broadcast: alla har redan fått erbjudandet, inget mer.
 *
 * Medvetet svep över alla företag (service role, som `expireRequests`):
 * varje träff hanteras sedan per `business_id`. Idempotent och säker att
 * köra parallellt (`for update skip locked`). `waitlist_offer` köas efter
 * commit. Kastar vid DB-fel (anroparen fångar).
 */
export async function expireWaitlistOffers(
  now: Date,
): Promise<ExpireWaitlistResult> {
  const { expired, events } = await withServiceTx(async (q) => {
    const r = await q.query<{ business_id: string; day: string }>(
      `update public.waitlist_entries
          set status = 'expired'
        where status = 'offered'
          and id in (
            select id from public.waitlist_entries
             where status = 'offered' and offer_expires_at <= $1
             order by offer_expires_at
             limit $2
             for update skip locked)
        returning business_id, day::text as day`,
      [now, EXPIRE_BATCH],
    );
    const out: WaitlistEvent[] = [];
    for (const row of r.rows) {
      const business = await loadWaitlistBusiness(q, row.business_id);
      if (!business || business.mode !== "sequential") continue;
      out.push(
        ...(await offerWaitingIn(q, {
          businessId: row.business_id,
          days: [row.day as LocalDate],
          now,
          business,
        })),
      );
    }
    return { expired: r.rows.length, events: out };
  });
  await emitWaitlistEvents(events);
  return { expired, offered: events.length };
}
