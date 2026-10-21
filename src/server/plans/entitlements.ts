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
  /** WP-80 (D-061): 'manual' = planen styrs av plattformsadmin (faktureras
   * utanför programmet) — ingen självbetjäning för planköp i appen. */
  billingMode: "app" | "manual";
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
  const r = await q.query<{
    plan: string;
    custom_limits: unknown;
    billing_mode?: string;
  }>(
    `select plan::text as plan, custom_limits, billing_mode
       from public.businesses where id = $1`,
    [businessId],
  );
  const row = r.rows[0];
  return {
    plan: row && isBusinessPlan(row.plan) ? row.plan : "free",
    customLimits: parseCustomLimits(row?.custom_limits),
    billingMode: row?.billing_mode === "manual" ? "manual" : "app",
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

export type PlanUsage = PlanInfo & {
  staff: { used: number; limit: number | null };
  services: { used: number; limit: number | null };
};

/** Översikten i Inställningar → Plan. Anroparen har redan kontrollerat
 * medlemskapet; läses som service role. */
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
    };
  });
}

/** Utskick (manuellt, blixttid): planen måste ha funktionen. */
export function checkCampaignPlan(
  businessId: string,
  feature: Feature,
): Promise<"plan_locked" | null> {
  return withServiceTx(async (q) =>
    planCan(await loadPlanIn(q, businessId), feature) ? null : "plan_locked",
  );
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
