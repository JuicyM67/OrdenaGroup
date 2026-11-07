import "server-only";

import { withServiceTx } from "@/server/db/tx";

/**
 * WP-83 (D-068): önskad betald plan från onboarding. Chile har ingen
 * planbetalning i appen (D-061/D-062) — önskemålet sparas i
 * `businesses.plan_requested` och teamet aktiverar planen i /admin
 * (med provperiod via `plan_override_until`). Planen ändras aldrig här.
 */

export const REQUESTABLE_PLANS = ["emprende", "equipo", "local"] as const;
export type RequestablePlan = (typeof REQUESTABLE_PLANS)[number];

export function isRequestablePlan(v: unknown): v is RequestablePlan {
  return (
    typeof v === "string" &&
    (REQUESTABLE_PLANS as readonly string[]).includes(v)
  );
}

export type RequestPlanResult =
  { ok: true } | { ok: false; code: "invalid_input" | "not_available" };

/**
 * Sparar önskemålet. Anroparen har redan kontrollerat att användaren är
 * ägare till `businessId` (servern körs som service_role, ingen update-grant
 * till authenticated). Bara företag på `free` med `billing_mode = 'app'` —
 * en plan som admin redan styr ändras inte via onboarding.
 */
export async function requestPlan(
  businessId: string,
  plan: unknown,
): Promise<RequestPlanResult> {
  if (!isRequestablePlan(plan)) return { ok: false, code: "invalid_input" };
  return withServiceTx(async (q) => {
    const r = await q.query(
      `update public.businesses
          set plan_requested = $2::public.business_plan,
              plan_requested_at = now()
        where id = $1
          and plan = 'free'
          and billing_mode = 'app'
          and status = 'active'
          and deletion_requested_at is null
        returning id`,
      [businessId, plan],
    );
    return r.rowCount === 1
      ? { ok: true }
      : { ok: false, code: "not_available" };
  });
}
