import "server-only";

import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";

/**
 * `private.admin_audit_log` (F19/WP-36): skrivs i SAMMA transaktion som
 * åtgärden den beskriver. `details` får bara innehålla id:n/koder, aldrig
 * namn/telefon/e-post (regel hård 7) — anroparen ansvarar för det, den här
 * funktionen gör ingen egen filtrering.
 */
export async function writeAuditLog(
  q: Queryable,
  entry: {
    adminUserId: string;
    action: string;
    businessId?: string | null;
    targetUserId?: string | null;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  await q.query(
    `insert into private.admin_audit_log
       (admin_user_id, action, business_id, target_user_id, details)
     values ($1, $2, $3, $4, $5)`,
    [
      entry.adminUserId,
      entry.action,
      entry.businessId ?? null,
      entry.targetUserId ?? null,
      JSON.stringify(entry.details ?? {}),
    ],
  );
}

export type AuditLogRow = {
  readonly id: string;
  readonly adminUserId: string;
  readonly action: string;
  readonly businessId: string | null;
  readonly targetUserId: string | null;
  readonly details: Record<string, unknown>;
  readonly createdAt: string;
};

/** Loggen för en företagsdetalj (`businessId` satt) eller den globala
 * aktivitetssidan (`businessId` utelämnad). */
export async function listAuditLog(
  opts: { businessId?: string; limit?: number } = {},
): Promise<readonly AuditLogRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  return withServiceTx(async (q) => {
    const r = await q.query<{
      id: string;
      admin_user_id: string;
      action: string;
      business_id: string | null;
      target_user_id: string | null;
      details: Record<string, unknown>;
      created_at: string;
    }>(
      opts.businessId
        ? `select id, admin_user_id, action, business_id, target_user_id, details, created_at
             from private.admin_audit_log
            where business_id = $1
            order by created_at desc
            limit $2`
        : `select id, admin_user_id, action, business_id, target_user_id, details, created_at
             from private.admin_audit_log
            order by created_at desc
            limit $1`,
      opts.businessId ? [opts.businessId, limit] : [limit],
    );
    return r.rows.map((row) => ({
      id: row.id,
      adminUserId: row.admin_user_id,
      action: row.action,
      businessId: row.business_id,
      targetUserId: row.target_user_id,
      details: row.details,
      createdAt: row.created_at,
    }));
  });
}
