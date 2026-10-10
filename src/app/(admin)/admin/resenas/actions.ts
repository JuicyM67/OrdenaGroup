"use server";

// Moderering av recensioner i /admin (WP-65, D-045, D-038): kräver
// plattformsadmin med aal2 (`requireAdminForAction`); varje åtgärd skrivs i
// `private.admin_audit_log` av `src/server/reviews/admin.ts`.
import { revalidatePath } from "next/cache";

import { requireAdminForAction } from "@/server/admin/auth";
import {
  hideReview,
  restoreReview,
  type AdminReviewResult,
} from "@/server/reviews/admin";

export async function hideReviewAction(
  businessId: string,
  reviewId: string,
): Promise<AdminReviewResult> {
  const admin = await requireAdminForAction();
  const result = await hideReview(admin.userId, businessId, reviewId);
  revalidatePath("/admin/resenas");
  return result;
}

export async function restoreReviewAction(
  businessId: string,
  reviewId: string,
): Promise<AdminReviewResult> {
  const admin = await requireAdminForAction();
  const result = await restoreReview(admin.userId, businessId, reviewId);
  revalidatePath("/admin/resenas");
  return result;
}
