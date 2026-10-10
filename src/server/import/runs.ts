import "server-only";

/**
 * WP-66 (D-046): kostnadskontroll för AI-importen. Varje körning loggas i
 * `public.ai_import_runs` (företag/användare, tid, tokens, uppskattad kostnad
 * i USD, status — aldrig URL, sidinnehåll eller persondata). Gränser:
 * - högst `DAILY_LIMIT` körningar per företag (eller per användare under
 *   onboarding, när företaget inte finns än) och rullande dygn;
 * - globalt månadstak `AI_IMPORT_MONTHLY_BUDGET_USD` (standard 80) — över
 *   taket pausas funktionen snyggt (`import.paused`).
 * Skrivs som `service_role` (tabellen har inga skrivgrants för
 * `authenticated`); varje fråga filtrerar på `business_id` eller `user_id`.
 */
import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";

import type { CallUsage } from "./claude";

export const DAILY_LIMIT = 3;
const DEFAULT_MONTHLY_BUDGET_USD = 80;

export function monthlyBudgetUsd(): number {
  const v = Number(process.env.AI_IMPORT_MONTHLY_BUDGET_USD);
  return Number.isFinite(v) && v >= 0 ? v : DEFAULT_MONTHLY_BUDGET_USD;
}

/** Fejkläget (lokalt/CI): aldrig i Vercels produktionsmiljö. */
export function isFakeMode(): boolean {
  return (
    process.env.AI_IMPORT_FAKE === "1" &&
    process.env.VERCEL_ENV !== "production"
  );
}

/** D-035: utan nyckel (och utan fejkläge) döljs funktionen helt. */
export function isImportEnabled(): boolean {
  return isFakeMode() || Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

async function monthSpendIn(q: Queryable): Promise<number> {
  const r = await q.query<{ total: string | null }>(
    `select coalesce(sum(cost_usd), 0)::text as total
       from public.ai_import_runs
      where created_at >= date_trunc('month', now() at time zone 'UTC') at time zone 'UTC'`,
  );
  return Number(r.rows[0]?.total ?? 0);
}

/** För sidladdning: visa "pausad" i stället för formuläret. */
export async function isImportPaused(): Promise<boolean> {
  if (isFakeMode()) return false;
  const spent = await withServiceTx(monthSpendIn);
  return spent >= monthlyBudgetUsd();
}

export type StartRunInput = {
  userId: string;
  businessId: string | null;
  source: "url" | "text";
  platform: string | null;
  model: string;
};

export type StartRunResult =
  | { ok: true; runId: string }
  | { ok: false; code: "import.daily_limit" | "import.paused" };

export async function startRun(input: StartRunInput): Promise<StartRunResult> {
  const fake = isFakeMode();
  return withServiceTx(async (q) => {
    // Serialisera samtidiga starter för samma företag/användare så att
    // gränsen inte kan passeras med parallella anrop.
    await q.query(`select pg_advisory_xact_lock(hashtext($1))`, [
      `ai_import:${input.businessId ?? input.userId}`,
    ]);
    if (!fake) {
      const recent = await q.query<{ n: number }>(
        input.businessId
          ? `select count(*)::int as n from public.ai_import_runs
              where business_id = $1 and status <> 'fake'
                and created_at > now() - interval '24 hours'`
          : `select count(*)::int as n from public.ai_import_runs
              where business_id is null and user_id = $1 and status <> 'fake'
                and created_at > now() - interval '24 hours'`,
        [input.businessId ?? input.userId],
      );
      if ((recent.rows[0]?.n ?? 0) >= DAILY_LIMIT) {
        return { ok: false, code: "import.daily_limit" } as const;
      }
      if ((await monthSpendIn(q)) >= monthlyBudgetUsd()) {
        return { ok: false, code: "import.paused" } as const;
      }
    }
    const r = await q.query<{ id: string }>(
      `insert into public.ai_import_runs (business_id, user_id, source, platform, status, model)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [
        input.businessId,
        input.userId,
        input.source,
        input.platform,
        fake ? "fake" : "running",
        fake ? "fake" : input.model,
      ],
    );
    return { ok: true, runId: r.rows[0]!.id } as const;
  });
}

export type RunStatus =
  | "ok"
  | "empty"
  | "refused"
  | "truncated"
  | "fetch_failed"
  | "failed"
  | "cancelled"
  | "fake";

export async function finishRun(
  runId: string,
  businessId: string | null,
  status: RunStatus,
  usage: CallUsage,
  durationMs: number,
): Promise<void> {
  await withServiceTx(async (q) => {
    await q.query(
      `update public.ai_import_runs
          set status = $3, input_tokens = $4, output_tokens = $5, web_fetches = $6,
              cost_usd = round($7::numeric, 4), duration_ms = $8, finished_at = now()
        where id = $1 and business_id is not distinct from $2`,
      [
        runId,
        businessId,
        status,
        usage.inputTokens,
        usage.outputTokens,
        usage.webFetches,
        usage.costUsd,
        Math.max(0, Math.round(durationMs)),
      ],
    );
  });
}
