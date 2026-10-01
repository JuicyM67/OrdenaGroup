import "server-only";

import { market } from "@/config/brand";
import { addLocalDays, APP_TZ, toLocalDate } from "@/lib/format/dates";
import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";

import { MAX_RECIPIENTS, writeCampaignAsSystem } from "./send";
import type { CampaignChannel } from "./types";

/**
 * WP-31: "Te echamos de menos" automatiskt. Anropas dagligen från
 * `/api/cron/retention` (planens ord: "befintlig retention-cron"), aldrig
 * från en agent. En kampanj per företag med `winback_days` satt (och ett
 * meddelande ifyllt), till kunder vars senaste avslutade besök passerade
 * gränsen och som inte fått en winback de senaste `WINBACK_REUSE_DAYS`
 * dagarna (`customers.last_winback_at`).
 *
 * Kanal: `sms` i SE, annars (CL) `email` — D-025 (en marknad per
 * installation, `sms_not_available` i CL annars, `send.ts`).
 */
const WINBACK_REUSE_DAYS = 90;

type BusinessRow = {
  id: string;
  winback_days: number;
  winback_message: string;
  winback_offer_pct: number | null;
  winback_offer_days: number | null;
};

async function eligibleBusinessesIn(q: Queryable): Promise<BusinessRow[]> {
  const r = await q.query<BusinessRow>(
    `select id, winback_days, winback_message, winback_offer_pct, winback_offer_days
       from public.businesses
      where winback_days is not null
        and winback_message is not null
        and btrim(winback_message) <> ''`,
  );
  return r.rows;
}

/** Kunder med samtycke vars senaste avslutade besök passerade
 * `winback_days` dagar sedan, och som inte fått en winback de senaste
 * `WINBACK_REUSE_DAYS` dagarna. Begränsad till `MAX_RECIPIENTS` (samma
 * pilotblockerare som `sendCampaign`). */
async function eligibleCustomerIdsIn(
  q: Queryable,
  businessId: string,
  winbackDays: number,
  now: Date,
): Promise<string[]> {
  const r = await q.query<{ id: string }>(
    `select c.id
       from public.customers c
      where c.business_id = $1
        and c.anonymized_at is null
        and c.consent_marketing_at is not null
        and (
          c.last_winback_at is null
          or c.last_winback_at < $2::timestamptz - make_interval(days => $3::int)
        )
        and exists (
          select 1 from public.bookings bk
           where bk.business_id = c.business_id and bk.customer_id = c.id
             and bk.status = 'completed'
           group by bk.customer_id
          having max(lower(bk.period)) < $2::timestamptz - make_interval(days => $4::int)
        )
      order by c.id
      limit $5`,
    [
      businessId,
      now.toISOString(),
      WINBACK_REUSE_DAYS,
      winbackDays,
      MAX_RECIPIENTS,
    ],
  );
  return r.rows.map((x) => x.id);
}

async function ownerUserIdIn(
  q: Queryable,
  businessId: string,
): Promise<string | undefined> {
  const r = await q.query<{ user_id: string }>(
    `select user_id from public.memberships
      where business_id = $1 and role = 'owner'
      order by created_at
      limit 1`,
    [businessId],
  );
  return r.rows[0]?.user_id;
}

async function markWinbackSentIn(
  q: Queryable,
  businessId: string,
  customerIds: readonly string[],
  now: Date,
): Promise<void> {
  if (customerIds.length === 0) return;
  await q.query(
    `update public.customers
        set last_winback_at = $3
      where business_id = $1 and id = any($2::uuid[])`,
    [businessId, customerIds, now.toISOString()],
  );
}

export type RunWinbackResult = {
  businesses: number;
  queued: number;
};

/** Dagligt svep (`/api/cron/retention`). Ett fel för ETT företag stoppar
 * aldrig de andra (samma "fortsätt ändå"-princip som `outbox`-cronens
 * `expireRequests`) — bara räknare returneras/loggas, aldrig persondata. */
export async function runWinback(now: Date): Promise<RunWinbackResult> {
  const businesses = await withServiceTx((q) => eligibleBusinessesIn(q));
  let queued = 0;
  let sentFor = 0;
  const channel: CampaignChannel = market === "SE" ? "sms" : "email";
  const today = toLocalDate(now, APP_TZ);

  for (const b of businesses) {
    try {
      const customerIds = await withServiceTx((q) =>
        eligibleCustomerIdsIn(q, b.id, b.winback_days, now),
      );
      if (customerIds.length === 0) continue;
      const ownerId = await withServiceTx((q) => ownerUserIdIn(q, b.id));
      if (!ownerId) continue;

      const offerValidUntil =
        b.winback_offer_pct !== null && b.winback_offer_days !== null
          ? addLocalDays(today, b.winback_offer_days)
          : null;

      const result = await writeCampaignAsSystem({
        businessId: b.id,
        createdBy: ownerId,
        name: `Te echamos de menos — ${today}`,
        channel,
        audience: { kind: "selected", customerIds },
        message: b.winback_message,
        offerPct: b.winback_offer_pct,
        offerText: null,
        offerValidUntil,
      });
      await withServiceTx((q) => markWinbackSentIn(q, b.id, customerIds, now));
      queued += result.queued;
      sentFor += 1;
    } catch {
      // Ett företags fel (t.ex. en tappad anslutning) stoppar inte svepet —
      // bara SQLSTATE hade varit intressant, men den skrivs av anroparen
      // (`/api/cron/retention`), inte här (src/server loggar aldrig).
    }
  }
  return { businesses: sentFor, queued };
}
