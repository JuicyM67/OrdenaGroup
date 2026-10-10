import "server-only";

import { APP_TZ } from "@/lib/format/dates";
import type { SmsCreditHistoryRow } from "@/lib/validation/sms-credits";
import { withServiceTx } from "@/server/db/tx";

/**
 * WP-76 (D-053): saldo och historik för Inställningar → Plan. Läses som
 * service role efter att sidan kontrollerat att personen är ägare (samma
 * mönster som `loadPlanUsage`).
 */
export type SmsCreditsOverview = {
  balance: number;
  /** ISO 8601, närmaste utgång bland köp med krediter kvar. */
  nextExpiry: string | null;
  nextExpiryCredits: number;
  history: SmsCreditHistoryRow[];
  /** Fler rader än som visas (länken "Visa alla"). */
  hasMoreHistory: boolean;
};

const HISTORY_LIMIT = 10;

export function loadSmsCreditsOverview(
  businessId: string,
  opts: { allHistory?: boolean } = {},
): Promise<SmsCreditsOverview> {
  return withServiceTx(async (q) => {
    const bal = await q.query<{
      balance: number;
      next_expiry: Date | null;
      next_expiry_credits: number;
    }>(`select * from private.sms_credit_balance($1)`, [businessId]);
    const purchases = await q.query<{
      id: string;
      at: Date;
      credits: number;
      amount_total: number;
      status: string;
      expired: boolean;
      receipt_url: string | null;
    }>(
      `select id, paid_at as at, credits_total as credits, amount_total, status,
              (expires_at <= now() and credits_remaining > 0) as expired,
              receipt_url
         from public.sms_credit_purchases
        where business_id = $1
          and status in ('paid', 'partially_refunded', 'refunded')
        order by paid_at desc
        limit 100`,
      [businessId],
    );
    const usage = await q.query<{ month: string; at: Date; credits: number }>(
      `select to_char(date_trunc('month', created_at at time zone $2), 'YYYY-MM-DD') as month,
              max(created_at) as at,
              (-sum(delta))::int as credits
         from public.sms_credit_ledger
        where business_id = $1 and kind in ('consume', 'release')
        group by 1
       having sum(delta) < 0
        order by 1 desc
        limit 24`,
      [businessId, APP_TZ],
    );
    const rows: SmsCreditHistoryRow[] = [
      ...purchases.rows.map((p): SmsCreditHistoryRow => ({
        id: p.id,
        at: p.at.toISOString(),
        kind: "purchase",
        credits: p.credits,
        amountTotalOre: p.amount_total,
        status: p.expired
          ? "expired"
          : (p.status as SmsCreditHistoryRow["status"]),
        ...(p.receipt_url ? { receiptUrl: p.receipt_url } : {}),
      })),
      ...usage.rows.map((u): SmsCreditHistoryRow => ({
        id: `usage:${u.month}`,
        at: u.at.toISOString(),
        kind: "usage",
        credits: u.credits,
        month: u.month,
      })),
    ].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    const b = bal.rows[0];
    return {
      balance: b?.balance ?? 0,
      nextExpiry: b?.next_expiry ? b.next_expiry.toISOString() : null,
      nextExpiryCredits: b?.next_expiry_credits ?? 0,
      history: opts.allHistory ? rows : rows.slice(0, HISTORY_LIMIT),
      hasMoreHistory: !opts.allHistory && rows.length > HISTORY_LIMIT,
    };
  });
}
