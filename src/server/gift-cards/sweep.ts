import "server-only";

import { withServiceTx } from "@/server/db/tx";

/**
 * WP-87 (D-073): cron-svepet (`/api/cron/outbox`) — utgångna kort (saldot
 * förfaller, ledger `expire`) och persondata (namn, e-post, hälsning) 90
 * dagar efter att kortet förbrukats/gått ut/anulerats. SE:s befintliga
 * `private.gift_card_sweep` (D-058) gör båda.
 */
export async function runGiftCardSweep(
  now: Date,
): Promise<{ expired: number; cleared: number }> {
  return withServiceTx(async (q) => {
    const r = await q.query<{ expired: number; cleared: number }>(
      `select expired, cleared from private.gift_card_sweep($1)`,
      [now],
    );
    return {
      expired: r.rows[0]?.expired ?? 0,
      cleared: r.rows[0]?.cleared ?? 0,
    };
  });
}
