import "server-only";

import { withServiceTx } from "@/server/db/tx";

/**
 * `getWaitlistOffer` (`@/server/waitlist`) returnerar bara `staffId`, inte
 * namnet (vyn är till för "Ta tiden", inte för att visa ett kort) — den
 * här filen slår upp visningsnamnet separat (D-029, samma idé som workern i
 * `src/server/messaging/outbox/worker.ts`: en sidoläsning för presentation,
 * ingen egen skrivväg).
 */
export async function loadStaffName(
  businessId: string,
  staffId: string,
): Promise<string | undefined> {
  return withServiceTx(async (q) => {
    const r = await q.query<{ name: string }>(
      `select name from public.staff where business_id = $1 and id = $2`,
      [businessId, staffId],
    );
    return r.rows[0]?.name;
  });
}
