import "server-only";

import { z } from "zod";

import { pgErrorCode } from "@/server/db/errors";
import { hasPerm } from "@/server/db/permissions";
import { withOwnerTx } from "@/server/db/tx";
import {
  authzCode,
  requireMember,
  requireMemberPerm,
} from "@/server/owner/member";

/**
 * WP-65 (D-045): företagets vy av sina recensioner (`/app/clientes/resenas`).
 * Läsning: hela teamet (owner + staff, RLS "read reviews"). Svara och
 * anmäla: ägaren eller `can_edit_settings` — både i TypeScript
 * (`requireMemberPerm`) och i RLS ("reply reviews" + kolumn-grants).
 * Ingen radering: en recension kan bara anmälas, plattformsadmin döljer.
 */

export type OwnerReviewFilter = "todas" | "sinResponder" | "bajas";

export type OwnerReview = {
  id: string;
  rating: number;
  comment: string | null;
  displayName: string | null;
  servicio: string | null;
  createdAt: string;
  reply: string | null;
  reportedAt: string | null;
  hidden: boolean;
};

export type OwnerReviewsData = {
  average: number | null;
  count: number;
  unanswered: number;
  items: OwnerReview[];
  canManage: boolean;
};

const LOW_RATING_MAX = 2;
const LIST_LIMIT = 200;

export async function listOwnerReviews(
  userId: string,
  businessId: string,
  filter: OwnerReviewFilter,
): Promise<OwnerReviewsData> {
  return withOwnerTx(userId, async (q) => {
    const member = await requireMember(q, userId, businessId);
    const stats = await q.query<{
      avg: string | null;
      count: number;
      unanswered: number;
    }>(
      `select round(avg(rating) filter (where hidden_at is null)::numeric, 1)::text as avg,
              (count(*) filter (where hidden_at is null))::int as count,
              (count(*) filter (where reply is null and hidden_at is null))::int as unanswered
         from public.reviews
        where business_id = $1`,
      [businessId],
    );
    const where =
      filter === "sinResponder"
        ? "and rv.reply is null"
        : filter === "bajas"
          ? `and rv.rating <= ${LOW_RATING_MAX}`
          : "";
    const r = await q.query<{
      id: string;
      rating: number;
      comment: string | null;
      display_name: string | null;
      servicio: string | null;
      created_at: string;
      reply: string | null;
      reported_at: string | null;
      hidden_at: string | null;
    }>(
      `select rv.id, rv.rating, rv.comment, rv.display_name, s.name as servicio,
              rv.created_at, rv.reply, rv.reported_at, rv.hidden_at
         from public.reviews rv
         join public.bookings bk on bk.business_id = rv.business_id and bk.id = rv.booking_id
         left join public.services s on s.business_id = bk.business_id and s.id = bk.service_id
        where rv.business_id = $1 ${where}
        order by rv.created_at desc
        limit $2`,
      [businessId, LIST_LIMIT],
    );
    const s = stats.rows[0];
    return {
      average: s?.avg ? Number(s.avg) : null,
      count: s?.count ?? 0,
      unanswered: s?.unanswered ?? 0,
      canManage: hasPerm(member, "can_edit_settings"),
      items: r.rows.map((x) => ({
        id: x.id,
        rating: x.rating,
        comment: x.comment,
        displayName: x.display_name,
        servicio: x.servicio,
        createdAt: new Date(x.created_at).toISOString(),
        reply: x.reply,
        reportedAt: x.reported_at
          ? new Date(x.reported_at).toISOString()
          : null,
        hidden: x.hidden_at !== null,
      })),
    };
  });
}

export type ReviewMutationResult = { ok: true } | { ok: false; code: string };

const UUID = z.uuid();
const replySchema = z.string().trim().max(1000);
export const REPORT_REASONS = [
  "offensive",
  "false",
  "personal_data",
  "not_customer",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  note: z.string().trim().max(500),
});

/** Svara offentligt (ett svar, redigerbart). Tom text tar bort svaret. */
export async function replyToReview(
  userId: string,
  businessId: string,
  reviewId: string,
  rawReply: unknown,
): Promise<ReviewMutationResult> {
  const id = UUID.safeParse(reviewId);
  const reply = replySchema.safeParse(rawReply);
  if (!id.success || !reply.success) {
    return { ok: false, code: "invalid_input" };
  }
  const text = reply.data === "" ? null : reply.data;
  try {
    return await withOwnerTx(userId, async (q) => {
      await requireMemberPerm(q, userId, businessId, "can_edit_settings");
      const r = await q.query(
        `update public.reviews
            set reply = $3, replied_at = case when $3::text is null then null else now() end
          where business_id = $1 and id = $2`,
        [businessId, id.data, text],
      );
      return r.rowCount
        ? ({ ok: true } as const)
        : ({ ok: false, code: "not_found" } as const);
    });
  } catch (e) {
    return { ok: false, code: authzCode(e) ?? pgErrorCode(e) ?? "unknown" };
  }
}

/** Anmäl till moderering (plattformsadmin). Kan inte ångras av företaget. */
export async function reportReview(
  userId: string,
  businessId: string,
  reviewId: string,
  raw: unknown,
): Promise<ReviewMutationResult> {
  const id = UUID.safeParse(reviewId);
  const input = reportSchema.safeParse(raw);
  if (!id.success || !input.success) {
    return { ok: false, code: "invalid_input" };
  }
  try {
    return await withOwnerTx(userId, async (q) => {
      await requireMemberPerm(q, userId, businessId, "can_edit_settings");
      const r = await q.query(
        `update public.reviews
            set reported_at = now(), report_reason = $3, report_note = $4
          where business_id = $1 and id = $2 and reported_at is null`,
        [
          businessId,
          id.data,
          input.data.reason,
          input.data.note === "" ? null : input.data.note,
        ],
      );
      return r.rowCount
        ? ({ ok: true } as const)
        : ({ ok: false, code: "not_found" } as const);
    });
  } catch (e) {
    return { ok: false, code: authzCode(e) ?? pgErrorCode(e) ?? "unknown" };
  }
}

/** Ajustes → Reglas: "Pedir reseña después de la cita" (D-045). */
export async function setReviewRequestsEnabled(
  userId: string,
  businessId: string,
  enabled: unknown,
): Promise<ReviewMutationResult> {
  if (typeof enabled !== "boolean") {
    return { ok: false, code: "invalid_input" };
  }
  try {
    return await withOwnerTx(userId, async (q) => {
      await requireMemberPerm(q, userId, businessId, "can_edit_settings");
      const r = await q.query(
        `update public.businesses set review_requests_enabled = $2 where id = $1`,
        [businessId, enabled],
      );
      return r.rowCount
        ? ({ ok: true } as const)
        : ({ ok: false, code: "not_found" } as const);
    });
  } catch (e) {
    return { ok: false, code: authzCode(e) ?? pgErrorCode(e) ?? "unknown" };
  }
}
