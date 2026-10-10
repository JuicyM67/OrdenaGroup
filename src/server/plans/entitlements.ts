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

/** Skickade sms (alla mottagare) denna kalendermånad i installationens
 * tidszon. Kvoten räknas på `sent`-rader i `message_outbox`. */
export async function smsSentThisMonthIn(
  q: Queryable,
  businessId: string,
): Promise<number> {
  const r = await q.query<{ n: number }>(
    `select count(*)::int as n from public.message_outbox
      where business_id = $1 and channel = 'sms' and status = 'sent'
        and sent_at >= (date_trunc('month', now() at time zone $2) at time zone $2)`,
    [businessId, APP_TZ],
  );
  return r.rows[0]?.n ?? 0;
}

/** Workern (service role): får företaget skicka ett sms till? */
export async function smsAllowedIn(
  q: Queryable,
  businessId: string,
): Promise<boolean> {
  const max = planLimit(await loadPlanIn(q, businessId), "sms");
  if (max === null) return true;
  if (max <= 0) return false;
  return (await smsSentThisMonthIn(q, businessId)) < max;
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

/** Kvar av månadens sms-kvot (`null` = obegränsat). */
export async function smsRemainingIn(
  q: Queryable,
  businessId: string,
): Promise<number | null> {
  const max = planLimit(await loadPlanIn(q, businessId), "sms");
  if (max === null) return null;
  return Math.max(0, max - (await smsSentThisMonthIn(q, businessId)));
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
