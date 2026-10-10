"use server";

// Server actions för Reseñas (WP-65, D-045): `userId` ur den verifierade
// sessionen och `businessId` via `getCurrentMember` — aldrig från klienten.
// `src/server/reviews/owner.ts` kontrollerar behörigheten själv
// (`can_edit_settings`), RLS gäller.
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import {
  replyToReview,
  reportReview,
  type ReviewMutationResult,
} from "@/server/reviews/owner";

async function currentMember(): Promise<
  { userId: string; businessId: string } | { ok: false; code: "forbidden" }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "forbidden" };
  const current = await getCurrentMember(user.id);
  if (!current) return { ok: false, code: "forbidden" };
  return { userId: user.id, businessId: current.business.id };
}

export async function replyToReviewAction(
  reviewId: string,
  reply: string,
): Promise<ReviewMutationResult> {
  const m = await currentMember();
  if ("ok" in m) return m;
  return replyToReview(m.userId, m.businessId, reviewId, reply);
}

export async function reportReviewAction(
  reviewId: string,
  input: { reason: string; note: string },
): Promise<ReviewMutationResult> {
  const m = await currentMember();
  if ("ok" in m) return m;
  return reportReview(m.userId, m.businessId, reviewId, input);
}
