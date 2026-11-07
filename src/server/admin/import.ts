import "server-only";

// WP-84 (D-069, port av SE WP-91): plattformsadmin kör AI-importen (WP-66) (från förra bokningssystemet) åt ett
// företag som inte klarar det själv. Samma kärna som ägarens import
// (`applyImportIn`), men via service_role efter adminkontrollen, med en rad i
// `private.admin_audit_log` (bara antal, inga namn).
import {
  importSelectionSchema,
  type ImportApplyResult,
} from "@/lib/validation/import";
import { withServiceTx } from "@/server/db/tx";
import { applyImportIn, importErrorResult } from "@/server/import/apply";
import type { ExistingNames } from "@/server/import/preview";

import { writeAuditLog } from "./audit";

/** Finns företaget? (API-routen svarar 404 i stället för ett FK-fel.) */
export function adminBusinessExists(businessId: string): Promise<boolean> {
  return withServiceTx(async (q) => {
    const r = await q.query(`select 1 from public.businesses where id = $1`, [
      businessId,
    ]);
    return r.rows.length > 0;
  });
}

/** Befintliga tjänst- och personalnamn (förhandsgranskningen markerar dubbletter). */
export function adminExistingNames(businessId: string): Promise<ExistingNames> {
  return withServiceTx(async (q) => {
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

export async function adminApplyImport(
  adminUserId: string,
  businessId: string,
  rawInput: unknown,
): Promise<ImportApplyResult> {
  const parsed = importSelectionSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    return await withServiceTx(async (q) => {
      const exists = await q.query<{ draft: boolean }>(
        `select (comuna = '' and category = '') as draft
           from public.businesses where id = $1`,
        [businessId],
      );
      if (!exists.rows.length) return { ok: false, code: "not_found" };
      // Ett utkast från en admin-inbjudan fylls av ägarens onboarding (som
      // har sin egen import) — annars dubbleras tjänster och personal.
      if (exists.rows[0]!.draft) return { ok: false, code: "onboarding_draft" };
      // service_role saknar medvetet DELETE på business_hours
      // (20260930110000): öppettiderna importeras bara när företaget inte
      // har några än (bara INSERT), annars hoppas de över.
      const hasHours = await q.query(
        `select 1 from public.business_hours where business_id = $1 limit 1`,
        [businessId],
      );
      const sel =
        parsed.data.hours && hasHours.rows.length > 0
          ? { ...parsed.data, hours: null }
          : parsed.data;
      const result = await applyImportIn(
        q,
        businessId,
        sel,
        () => Promise.resolve(),
        { hoursInsertOnly: true },
      );
      if (result.ok) {
        await writeAuditLog(q, {
          adminUserId,
          action: "import",
          businessId,
          details: {
            services: result.created.services,
            staff: result.created.staff,
            categories: result.created.categories,
            profile: Object.keys(parsed.data.profile).length,
            hours: sel.hours !== null,
          },
        });
      }
      return result;
    });
  } catch (e) {
    return importErrorResult(e);
  }
}
