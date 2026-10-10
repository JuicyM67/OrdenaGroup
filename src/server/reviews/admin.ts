import "server-only";

import { writeAuditLog } from "@/server/admin/audit";
import { withServiceTx } from "@/server/db/tx";

/**
 * WP-65 (D-045, D-038): plattformsadmin modererar anmälda recensioner —
 * dölja/återställa, aldrig radera. Varje åtgärd skrivs i
 * `private.admin_audit_log` i samma transaktion (bara id:n och koder,
 * ingen text/namn, regel hård 7). Anroparen (server action) har redan
 * kört `requireAdminForAction()`.
 */

export type AdminReview = {
  id: string;
  businessId: string;
  negocio: string;
  slug: string;
  rating: number;
  comment: string | null;
  displayName: string | null;
  reply: string | null;
  createdAt: string;
  reportedAt: string | null;
  reportReason: string | null;
  reportNote: string | null;
  hiddenAt: string | null;
};

export type AdminReviewFilter = "reported" | "hidden";

/** Anmälda (ej dolda) eller dolda recensioner, över alla företag. */
export async function listModerationReviews(
  filter: AdminReviewFilter,
): Promise<AdminReview[]> {
  return withServiceTx(async (q) => {
    const r = await q.query<{
      id: string;
      business_id: string;
      negocio: string;
      slug: string;
      rating: number;
      comment: string | null;
      display_name: string | null;
      reply: string | null;
      created_at: string;
      reported_at: string | null;
      report_reason: string | null;
      report_note: string | null;
      hidden_at: string | null;
    }>(
      `select rv.id, rv.business_id, b.name as negocio, b.slug, rv.rating,
              rv.comment, rv.display_name, rv.reply, rv.created_at,
              rv.reported_at, rv.report_reason, rv.report_note, rv.hidden_at
         from public.reviews rv
         join public.businesses b on b.id = rv.business_id
        where ${
          filter === "hidden"
            ? "rv.hidden_at is not null"
            : "rv.reported_at is not null and rv.hidden_at is null"
        }
        order by coalesce(rv.reported_at, rv.created_at) desc
        limit 200`,
    );
    return r.rows.map((x) => ({
      id: x.id,
      businessId: x.business_id,
      negocio: x.negocio,
      slug: x.slug,
      rating: x.rating,
      comment: x.comment,
      displayName: x.display_name,
      reply: x.reply,
      createdAt: new Date(x.created_at).toISOString(),
      reportedAt: x.reported_at ? new Date(x.reported_at).toISOString() : null,
      reportReason: x.report_reason,
      reportNote: x.report_note,
      hiddenAt: x.hidden_at ? new Date(x.hidden_at).toISOString() : null,
    }));
  });
}

export type AdminReviewResult = { ok: true } | { ok: false; code: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function setHidden(
  adminUserId: string,
  businessId: string,
  reviewId: string,
  hidden: boolean,
): Promise<AdminReviewResult> {
  if (!UUID.test(businessId) || !UUID.test(reviewId)) {
    return { ok: false, code: "invalid_input" };
  }
  return withServiceTx(async (q) => {
    const r = await q.query(
      hidden
        ? `update public.reviews set hidden_at = now()
            where business_id = $1 and id = $2 and hidden_at is null`
        : `update public.reviews
              set hidden_at = null, reported_at = null, report_reason = null, report_note = null
            where business_id = $1 and id = $2 and (hidden_at is not null or reported_at is not null)`,
      [businessId, reviewId],
    );
    if (!r.rowCount) return { ok: false, code: "not_found" };
    await writeAuditLog(q, {
      adminUserId,
      action: hidden ? "review_hide" : "review_restore",
      businessId,
      details: { reviewId },
    });
    return { ok: true };
  });
}

export function hideReview(
  adminUserId: string,
  businessId: string,
  reviewId: string,
): Promise<AdminReviewResult> {
  return setHidden(adminUserId, businessId, reviewId, true);
}

/** Återställer (synlig igen) och stänger anmälan — "anmälan avvisad". */
export function restoreReview(
  adminUserId: string,
  businessId: string,
  reviewId: string,
): Promise<AdminReviewResult> {
  return setHidden(adminUserId, businessId, reviewId, false);
}
