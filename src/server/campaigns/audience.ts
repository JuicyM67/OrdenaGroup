import "server-only";

import type { Queryable } from "@/server/db/pool";

import type { CampaignAudience } from "./types";

/**
 * WP-31: löser upp `CampaignAudience` till ett SQL-villkor mot `customers c`
 * (aliaset används av alla anropare nedan). Bara `kind` styr grenen (redan
 * validerad av `campaignInputSchema`) — `days`/`customerIds` går som
 * parametrar, aldrig interpolerade i strängen.
 *
 * - `all`: alla kunder.
 * - `members`: `is_member`.
 * - `regulars`: minst 3 avslutade bokningar (samma gräns som "stamkund" i
 *   WP-24, `20260930200300_customers_indexes_and_report_functions.sql`).
 * - `inactive`: minst en avslutad bokning, och den SENASTE passerade
 *   `days` dagar sedan (ingen bokning alls räknas INTE som inaktiv här —
 *   det är en annan grupp, "aldrig bokat").
 * - `selected`: en uttrycklig lista kund-id (redan begränsad till företaget
 *   av `where`-satsen i varje anropare nedan, aldrig bara `= any(...)`).
 */
function audienceFragment(
  audience: CampaignAudience,
  paramIndex: number,
): { sql: string; params: unknown[] } {
  switch (audience.kind) {
    case "all":
      return { sql: "true", params: [] };
    case "members":
      return { sql: "c.is_member", params: [] };
    case "regulars":
      return {
        sql: `(
          select count(*) from public.bookings bk
           where bk.business_id = c.business_id and bk.customer_id = c.id
             and bk.status = 'completed'
        ) >= 3`,
        params: [],
      };
    case "inactive":
      return {
        sql: `exists (
          select 1 from public.bookings bk
           where bk.business_id = c.business_id and bk.customer_id = c.id
             and bk.status = 'completed'
           group by bk.customer_id
          having max(lower(bk.period)) < now() - make_interval(days => $${paramIndex}::int)
        )`,
        params: [audience.days],
      };
    case "selected":
      return {
        sql: `c.id = any($${paramIndex}::uuid[])`,
        params: [audience.customerIds],
      };
  }
}

export type AudienceStats = { recipients: number; skippedNoConsent: number };

/** E-post (enda kanalen för utskick) kräver att kunden har en adress. */
const EMAIL_FRAGMENT = "c.email is not null and btrim(c.email) <> ''";

/**
 * Antal mottagare (samtycke + kanal) och antal som matchar målgruppen men
 * SAKNAR marknadsföringssamtycke (för förhandsvisningens "X hoppas över").
 * Räknas i anroparens transaktion (`withOwnerTx`, RLS gäller).
 */
export async function audienceStatsIn(
  q: Queryable,
  businessId: string,
  audience: CampaignAudience,
): Promise<AudienceStats> {
  const frag = audienceFragment(audience, 2);
  const chan = EMAIL_FRAGMENT;
  const r = await q.query<{ recipients: string; skipped_no_consent: string }>(
    `select
       count(*) filter (where c.consent_marketing_at is not null and (${chan})) as recipients,
       count(*) filter (where c.consent_marketing_at is null) as skipped_no_consent
       from public.customers c
      where c.business_id = $1 and c.anonymized_at is null and (${frag.sql})`,
    [businessId, ...frag.params],
  );
  const row = r.rows[0];
  return {
    recipients: Number(row?.recipients ?? 0),
    skippedNoConsent: Number(row?.skipped_no_consent ?? 0),
  };
}

/** Kund-id:n som faktiskt ska få kampanjen (samtycke + kanal), upp till
 * `limit` (rate limit-spärren i `send.ts` kontrollerar den riktiga gränsen
 * — den här bara skyddar frågan från ett orimligt stort svar). */
export async function resolveAudienceIn(
  q: Queryable,
  businessId: string,
  audience: CampaignAudience,
  limit: number,
): Promise<string[]> {
  const frag = audienceFragment(audience, 3);
  const chan = EMAIL_FRAGMENT;
  const r = await q.query<{ id: string }>(
    `select c.id
       from public.customers c
      where c.business_id = $1 and c.anonymized_at is null
        and c.consent_marketing_at is not null and (${chan})
        and (${frag.sql})
      order by c.id
      limit $2`,
    [businessId, limit, ...frag.params],
  );
  return r.rows.map((x) => x.id);
}

/** Inicio-kortet "Te echamos de menos": antal kunder med samtycke vars
 * senaste avslutade besök passerade `days` dagar sedan. Samma `inactive`-
 * gren som ovan, utan kanalkrav (kortet visar bara ett antal). */
export async function countInactiveCustomersIn(
  q: Queryable,
  businessId: string,
  days: number,
): Promise<number> {
  const frag = audienceFragment({ kind: "inactive", days }, 2);
  const r = await q.query<{ n: string }>(
    `select count(*) as n
       from public.customers c
      where c.business_id = $1 and c.anonymized_at is null
        and c.consent_marketing_at is not null and (${frag.sql})`,
    [businessId, ...frag.params],
  );
  return Number(r.rows[0]?.n ?? 0);
}
