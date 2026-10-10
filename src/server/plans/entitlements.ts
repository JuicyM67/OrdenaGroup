import "server-only";

import {
  can,
  limit,
  parseCustomLimits,
  type BusinessPlan,
  type CustomLimits,
  type Feature,
  type LimitKind,
  isBusinessPlan,
} from "@/config/plans";
import { APP_TZ } from "@/lib/format/dates";
import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";
import {
  crossesWarnLevel,
  enqueueSmsNoticeIn,
  hasEverBoughtCreditsIn,
} from "@/server/billing/sms-credits/notices";

/**
 * Planspärrar på servern (WP-73, D-048). Matrisen ligger i `src/config/plans.ts`;
 * här läses företagets plan och användning. Varje action/route/cron som
 * startar en planberoende funktion anropar `loadPlanIn` + `can`/`limit` i
 * samma transaktion som själva ändringen.
 */

export type PlanInfo = {
  plan: BusinessPlan;
  customLimits: CustomLimits;
};

export class PlanLockedError extends Error {
  constructor(readonly code: "plan_locked" | "plan_limit") {
    super(code);
  }
}

export async function loadPlanIn(
  q: Queryable,
  businessId: string,
): Promise<PlanInfo> {
  const r = await q.query<{ plan: string; custom_limits: unknown }>(
    `select plan::text as plan, custom_limits
       from public.businesses where id = $1`,
    [businessId],
  );
  const row = r.rows[0];
  return {
    plan: row && isBusinessPlan(row.plan) ? row.plan : "free",
    customLimits: parseCustomLimits(row?.custom_limits),
  };
}

export function planCan(info: PlanInfo, feature: Feature): boolean {
  return can(info.plan, feature);
}

export function planLimit(info: PlanInfo, kind: LimitKind): number | null {
  return limit(info.plan, kind, info.customLimits);
}

/** Kastar `PlanLockedError("plan_locked")` om planen saknar funktionen. */
export async function requireFeatureIn(
  q: Queryable,
  businessId: string,
  feature: Feature,
): Promise<PlanInfo> {
  const info = await loadPlanIn(q, businessId);
  if (!planCan(info, feature)) throw new PlanLockedError("plan_locked");
  return info;
}

export async function activeServiceCountIn(
  q: Queryable,
  businessId: string,
): Promise<number> {
  const r = await q.query<{ n: number }>(
    `select count(*)::int as n from public.services
      where business_id = $1 and active`,
    [businessId],
  );
  return r.rows[0]?.n ?? 0;
}

/** `true` om företaget får ha en aktiv tjänst till. */
export async function canAddActiveServiceIn(
  q: Queryable,
  businessId: string,
): Promise<boolean> {
  const max = planLimit(await loadPlanIn(q, businessId), "services");
  if (max === null) return true;
  return (await activeServiceCountIn(q, businessId)) < max;
}

/** Skickade sms-segment (alla mottagare) denna kalendermånad i
 * installationens tidszon. Kvoten räknas i segment från WP-76 (D-053); äldre
 * rader utan `sms_segments` räknas som 1. */
export async function smsSentThisMonthIn(
  q: Queryable,
  businessId: string,
): Promise<number> {
  const r = await q.query<{ n: number }>(
    `select coalesce(sum(coalesce(sms_segments, 1)), 0)::int as n
       from public.message_outbox
      where business_id = $1 and channel = 'sms' and status = 'sent'
        and sent_at >= (date_trunc('month', now() at time zone $2) at time zone $2)`,
    [businessId, APP_TZ],
  );
  return r.rows[0]?.n ?? 0;
}

/** WP-76: oförbrukade sms-krediter i giltiga köp. */
export async function smsCreditBalanceIn(
  q: Queryable,
  businessId: string,
): Promise<number> {
  const r = await q.query<{ balance: number }>(
    `select balance from private.sms_credit_balance($1)`,
    [businessId],
  );
  return r.rows[0]?.balance ?? 0;
}

export type PlanUsage = PlanInfo & {
  staff: { used: number; limit: number | null };
  services: { used: number; limit: number | null };
  sms: { used: number; limit: number | null };
};

/** Översikten i Inställningar → Plan. Anroparen har redan kontrollerat
 * medlemskapet; läses som service role (sms-räkningen kräver `message_outbox`,
 * som bara ägaren får läsa via RLS). */
export function loadPlanUsage(businessId: string): Promise<PlanUsage> {
  return withServiceTx(async (q) => {
    const info = await loadPlanIn(q, businessId);
    const seats = await q.query<{ n: number }>(
      `select private.staff_seat_count($1)::int as n`,
      [businessId],
    );
    return {
      ...info,
      staff: { used: seats.rows[0]?.n ?? 0, limit: planLimit(info, "staff") },
      services: {
        used: await activeServiceCountIn(q, businessId),
        limit: planLimit(info, "services"),
      },
      sms: {
        used: await smsSentThisMonthIn(q, businessId),
        limit: planLimit(info, "sms"),
      },
    };
  });
}

/** Kvar av månadens sms-kvot plus köpta krediter (`null` = obegränsat).
 * WP-76 (D-053): Gratis (kvot 0) har bara sina krediter. */
export async function smsRemainingIn(
  q: Queryable,
  businessId: string,
): Promise<number | null> {
  const max = planLimit(await loadPlanIn(q, businessId), "sms");
  if (max === null) return null;
  const quotaLeft = Math.max(
    0,
    max - (await smsSentThisMonthIn(q, businessId)),
  );
  return quotaLeft + (await smsCreditBalanceIn(q, businessId));
}

/** Utskick (manuellt, blixttid): planen måste ha funktionen, och ett
 * sms-utskick får inte överskrida månadens kvarvarande sms-kvot. */
export function checkCampaignPlan(
  businessId: string,
  feature: Feature,
  channel: "email" | "sms",
  recipients: number,
): Promise<"plan_locked" | "sms_quota" | null> {
  return withServiceTx(async (q) => {
    if (!planCan(await loadPlanIn(q, businessId), feature)) {
      return "plan_locked";
    }
    if (channel === "sms") {
      const left = await smsRemainingIn(q, businessId);
      if (left !== null && recipients > left) return "sms_quota";
    }
    return null;
  });
}

/** Egen transaktion (service role): har företagets plan funktionen? För
 * actions som inte redan har en transaktion öppen. */
export function businessCan(
  businessId: string,
  feature: Feature,
): Promise<boolean> {
  return withServiceTx(async (q) =>
    planCan(await loadPlanIn(q, businessId), feature),
  );
}

/** Sidor (serverkomponenter): företagets plan i en egen transaktion. */
export function loadBusinessPlan(businessId: string): Promise<PlanInfo> {
  return withServiceTx((q) => loadPlanIn(q, businessId));
}

/** Resultatet av en sms-reservation: `quota` = planens kvot, `credit` =
 * köpta krediter (helt eller delvis), `null` = blockerad (kvot och krediter slut). */
export type SmsReservation = "quota" | "credit" | null;

/**
 * Outbox-workern (service role), WP-73 säkerhetsgranskning + WP-76 (D-053):
 * reserverar `segments` sms-segment för raden `outboxId` ATOMISKT. Advisory
 * lock per företag serialiserar parallella pass; räknar skickade segment +
 * rader i `sending` som redan reserverat (`quota_reserved_at`), utom raden
 * själv. Ordning: planens kvot först, sedan köpta krediter (FIFO, äldsta
 * giltiga köp, `private.sms_credit_consume`). En rad som redan tagit krediter
 * (retry) behåller dem och tar inga nya. Varningarna (80 %, slut) köas i
 * samma transaktion, högst en per typ och månad (`notices.ts`).
 */
export async function reserveSmsQuotaIn(
  q: Queryable,
  businessId: string,
  outboxId: string,
  segments = 1,
): Promise<SmsReservation> {
  const seg = Math.max(1, Math.trunc(segments));
  const max = planLimit(await loadPlanIn(q, businessId), "sms");
  const mark = () =>
    q.query(
      `update public.message_outbox
          set quota_reserved_at = now(), sms_segments = $3
        where id = $1 and business_id = $2`,
      [outboxId, businessId, seg],
    );
  if (max === null) {
    await mark();
    return "quota";
  }
  // Låset tas även när kvoten är 0 (Gratis): krediter kan finnas.
  await q.query(`select pg_advisory_xact_lock(hashtext('sms:' || $1::text))`, [
    businessId,
  ]);
  const prior = await q.query<{ n: number }>(
    `select coalesce(-sum(delta), 0)::int as n from public.sms_credit_ledger
      where business_id = $1 and outbox_id = $2 and kind = 'consume'`,
    [businessId, outboxId],
  );
  if ((prior.rows[0]?.n ?? 0) > 0) {
    await mark();
    return "credit";
  }
  const r = await q.query<{ n: number }>(
    `select coalesce(sum(coalesce(sms_segments, 1)), 0)::int as n
       from public.message_outbox
      where business_id = $1 and channel = 'sms' and id <> $2
        and (status = 'sent'
             or (status = 'sending' and quota_reserved_at is not null))
        and coalesce(sent_at, quota_reserved_at)
            >= (date_trunc('month', now() at time zone $3) at time zone $3)`,
    [businessId, outboxId, APP_TZ],
  );
  const used = r.rows[0]?.n ?? 0;
  const quotaLeft = Math.max(0, max - used);
  const warn80 = async () => {
    if (max > 0 && crossesWarnLevel(used, Math.min(seg, quotaLeft), max)) {
      await enqueueSmsNoticeIn(q, businessId, "smsCuota80", {
        usado: Math.min(max, used + seg),
        max,
      });
    }
  };
  if (seg <= quotaLeft) {
    await mark();
    await warn80();
    return "quota";
  }
  const need = seg - quotaLeft;
  const c = await q.query<{ n: number }>(
    `select private.sms_credit_consume($1, $2, $3) as n`,
    [businessId, outboxId, need],
  );
  if ((c.rows[0]?.n ?? 0) > 0) {
    await mark();
    await warn80();
    return "credit";
  }
  // Slut. Gratis-företag som aldrig köpt krediter får inget mejl varje månad.
  if (max > 0 || (await hasEverBoughtCreditsIn(q, businessId))) {
    await enqueueSmsNoticeIn(q, businessId, "smsAgotados", {
      usado: Math.min(max, used),
      max,
    });
  }
  return null;
}
