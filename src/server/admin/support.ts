import "server-only";

/**
 * WP-90 (D-076, port av SE:s WP-112/D-087): modo soporte. En plattformsadmin
 * får ett tidsbegränsat medlemskap i ett företag (`memberships.support_until`,
 * roll `staff` med de sju vanliga behörigheterna, utan `can_view_records` och
 * utan personalrad) och använder företagets vanliga panel (/app). Databasen
 * slutar själv godkänna raden när tiden gått ut (`private.is_member`/
 * `has_perm`), se migrationen 20261113010000.
 *
 * Bara ett företag åt gången: en ny start avslutar adminens andra
 * supportrader. Start och avslut loggas i `admin_audit_log` (bara id:n,
 * sluttid och orsak, regel 7).
 */
import { withServiceTx } from "@/server/db/tx";

import { writeAuditLog } from "./audit";

export const SUPPORT_MINUTES = 60;
export const SUPPORT_START_ACTION = "support_start";
export const SUPPORT_END_ACTION = "support_end";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StartSupportResult =
  | { ok: true; until: string }
  | { ok: false; code: "not_found" | "already_member" };

export async function startSupport(
  adminUserId: string,
  businessId: string,
): Promise<StartSupportResult> {
  if (!UUID.test(businessId)) return { ok: false, code: "not_found" };
  return withServiceTx(async (q) => {
    const others = await q.query<{ business_id: string }>(
      `select business_id from public.memberships
        where user_id = $1 and support_until is not null and business_id <> $2`,
      [adminUserId, businessId],
    );
    for (const row of others.rows) {
      await q.query(`select private.end_support($1, $2)`, [
        adminUserId,
        row.business_id,
      ]);
      await writeAuditLog(q, {
        adminUserId,
        action: SUPPORT_END_ACTION,
        businessId: row.business_id,
        details: { reason: "switched" },
      });
    }

    const r = await q.query<{ result: string; until: Date | string }>(
      `select private.start_support($1, $2, now() + make_interval(mins => $3)) as result,
              now() + make_interval(mins => $3) as until`,
      [adminUserId, businessId, SUPPORT_MINUTES],
    );
    const row = r.rows[0];
    if (row?.result === "already_member" || row?.result === "not_found") {
      return { ok: false, code: row.result };
    }
    const until = new Date(row!.until).toISOString();
    await writeAuditLog(q, {
      adminUserId,
      action: SUPPORT_START_ACTION,
      businessId,
      details: { until },
    });
    return { ok: true, until };
  });
}

/** Avslutar adminens supportläge (alla företag). Returnerar företaget som
 * var öppet, eller `null` om inget var det. Rör aldrig ett vanligt
 * medlemskap. */
export async function endSupport(
  adminUserId: string,
): Promise<{ businessId: string | null }> {
  return withServiceTx(async (q) => {
    const rows = await q.query<{ business_id: string; active: boolean }>(
      `select business_id, support_until > now() as active
         from public.memberships
        where user_id = $1 and support_until is not null
        order by support_until desc`,
      [adminUserId],
    );
    if (rows.rows.length === 0) return { businessId: null };
    await q.query(`select private.end_support($1)`, [adminUserId]);
    for (const row of rows.rows) {
      await writeAuditLog(q, {
        adminUserId,
        action: SUPPORT_END_ACTION,
        businessId: row.business_id,
        details: { reason: row.active ? "ended" : "expired" },
      });
    }
    return { businessId: rows.rows[0]!.business_id };
  });
}
