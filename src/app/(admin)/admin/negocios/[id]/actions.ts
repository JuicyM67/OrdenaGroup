"use server";

// Server actions för en företagsdetalj i /admin (F19/WP-36). Varje action
// kör `requireAdminForAction()` FÖRST (404/401-liknande beteende hanteras
// redan av sidan — här kastar vi bara om sessionen skulle ha tappat sin
// aal2 mellan sidladdning och knapptryck) och skriver sedan en rad i
// `private.admin_audit_log` (se respektive `src/server/admin/*`-funktion).
import { revalidatePath } from "next/cache";

import { requireAdminForAction } from "@/server/admin/auth";
import {
  adminCancelDeletion,
  adminRequestDeletion,
  changeEmail,
  freezeBusiness,
  sendLoginLink,
  setPlan,
  unfreezeBusiness,
  type AdminActionResult,
  type BusinessPlan,
} from "@/server/admin/businesses";

async function afterAction(businessId: string): Promise<void> {
  revalidatePath(`/admin/negocios/${businessId}`);
  revalidatePath("/admin");
}

export async function setPlanAction(
  businessId: string,
  plan: BusinessPlan,
  overrideUntil: string | null,
  customLimits: { staff?: number; sms?: number } | null = null,
): Promise<AdminActionResult> {
  const admin = await requireAdminForAction();
  const result = await setPlan(
    admin.userId,
    businessId,
    plan,
    overrideUntil,
    customLimits,
  );
  await afterAction(businessId);
  return result;
}

export async function freezeAction(
  businessId: string,
): Promise<AdminActionResult> {
  const admin = await requireAdminForAction();
  const result = await freezeBusiness(admin.userId, businessId);
  await afterAction(businessId);
  return result;
}

export async function unfreezeAction(
  businessId: string,
): Promise<AdminActionResult> {
  const admin = await requireAdminForAction();
  const result = await unfreezeBusiness(admin.userId, businessId);
  await afterAction(businessId);
  return result;
}

export async function requestDeletionAction(
  businessId: string,
): Promise<AdminActionResult> {
  const admin = await requireAdminForAction();
  const result = await adminRequestDeletion(admin.userId, businessId);
  await afterAction(businessId);
  return result;
}

export async function cancelDeletionAction(
  businessId: string,
): Promise<AdminActionResult> {
  const admin = await requireAdminForAction();
  const result = await adminCancelDeletion(admin.userId, businessId);
  await afterAction(businessId);
  return result;
}

export async function sendLoginLinkAction(
  businessId: string,
  targetUserId: string,
): Promise<AdminActionResult> {
  const admin = await requireAdminForAction();
  return sendLoginLink(admin.userId, targetUserId, businessId);
}

export async function changeEmailAction(
  businessId: string,
  targetUserId: string,
  newEmail: string,
): Promise<AdminActionResult> {
  const admin = await requireAdminForAction();
  const result = await changeEmail(
    admin.userId,
    targetUserId,
    businessId,
    newEmail,
  );
  await afterAction(businessId);
  return result;
}
