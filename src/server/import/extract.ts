import "server-only";

/**
 * WP-66 (D-046): en import-körning från början till slut — tillgänglighet,
 * validering (URL-allowlist eller inklistrad text), gränser och logg
 * (`runs.ts`), Claude eller fejkläget, och mappningen till
 * förhandsgranskningen. Anropas av `POST /api/import/extract`.
 */
import { market } from "@/config/brand";
import type { ImportExtractResponse } from "@/lib/validation/import";
import { withOwnerTx } from "@/server/db/tx";
import { requireOwnerMember } from "@/server/owner/member";
import { authzCode } from "@/server/owner/member";

import { importModel, runClaudeImport, ZERO_USAGE } from "./claude";
import { fakeExtraction } from "./fixtures";
import { importUrlSchema } from "./platforms";
import { toPreview, type ExistingNames } from "./preview";
import { finishRun, isFakeMode, isImportEnabled, startRun } from "./runs";

export const TEXT_MIN = 40;
export const TEXT_MAX = 30_000;

export type ExtractRequest =
  { source: "url"; url: string } | { source: "text"; text: string };

function parseRequest(
  raw: unknown,
):
  | {
      ok: true;
      req: ExtractRequest;
      platform: { key: string; name: string } | null;
    }
  | { ok: false; code: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, code: "invalid_input" };
  }
  const r = raw as Record<string, unknown>;
  if (r.source === "url") {
    const p = importUrlSchema.safeParse(r.url);
    if (!p.success) {
      return {
        ok: false,
        code: p.error.issues[0]?.message ?? "import.url_invalid",
      };
    }
    return {
      ok: true,
      req: { source: "url", url: p.data.url },
      platform: { key: p.data.platform.key, name: p.data.platform.name },
    };
  }
  if (r.source === "text" && typeof r.text === "string") {
    const text = r.text.trim();
    if (text.length < TEXT_MIN)
      return { ok: false, code: "import.text_too_short" };
    if (text.length > TEXT_MAX)
      return { ok: false, code: "import.text_too_long" };
    return { ok: true, req: { source: "text", text }, platform: null };
  }
  return { ok: false, code: "invalid_input" };
}

async function existingNames(
  userId: string,
  businessId: string,
): Promise<ExistingNames> {
  return withOwnerTx(userId, async (q) => {
    await requireOwnerMember(q, userId, businessId);
    const s = await q.query<{ name: string }>(
      `select name from public.services where business_id = $1`,
      [businessId],
    );
    const st = await q.query<{ name: string }>(
      `select name from public.staff where business_id = $1`,
      [businessId],
    );
    return {
      services: s.rows.map((r) => r.name),
      staff: st.rows.map((r) => r.name),
    };
  });
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    });
  });
}

/** `businessId` = null under onboarding (företaget finns inte än). */
export async function extractForImport(
  userId: string,
  businessId: string | null,
  raw: unknown,
  signal?: AbortSignal,
): Promise<ImportExtractResponse> {
  if (!isImportEnabled()) return { ok: false, code: "import.unavailable" };
  const parsed = parseRequest(raw);
  if (!parsed.ok) return parsed;
  const { req, platform } = parsed;

  let existing: ExistingNames | undefined;
  if (businessId) {
    try {
      existing = await existingNames(userId, businessId);
    } catch (e) {
      return { ok: false, code: authzCode(e) ?? "unknown" };
    }
  }

  const model = importModel();
  const started = await startRun({
    userId,
    businessId,
    source: req.source,
    platform: platform?.key ?? null,
    model,
  });
  if (!started.ok) return started;
  const t0 = performance.now();

  if (isFakeMode()) {
    await wait(2500, signal);
    await finishRun(
      started.runId,
      businessId,
      "fake",
      ZERO_USAGE,
      performance.now() - t0,
    );
    if (signal?.aborted) return { ok: false, code: "import.cancelled" };
    return {
      ok: true,
      preview: toPreview(
        fakeExtraction(market),
        platform?.name ?? null,
        existing,
      ),
    };
  }

  const result = await runClaudeImport(
    req.source === "url"
      ? { kind: "url", url: req.url }
      : { kind: "text", text: req.text },
    market,
    signal,
  );
  await finishRun(
    started.runId,
    businessId,
    result.status === "rate_limited" ? "failed" : result.status,
    result.usage,
    performance.now() - t0,
  );

  switch (result.status) {
    case "ok":
      return {
        ok: true,
        preview: toPreview(result.extraction, platform?.name ?? null, existing),
      };
    case "empty":
      return { ok: false, code: "import.empty" };
    case "fetch_failed":
      return { ok: false, code: "import.fetch_failed" };
    case "refused":
      return { ok: false, code: "import.refused" };
    case "cancelled":
      return { ok: false, code: "import.cancelled" };
    case "rate_limited":
      return { ok: false, code: "import.busy" };
    default:
      return { ok: false, code: "import.failed" };
  }
}
