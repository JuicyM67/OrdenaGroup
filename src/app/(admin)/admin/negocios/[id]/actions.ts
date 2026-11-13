"use server";

// Server actions för en företagsdetalj i /admin (F19/WP-36). Varje action
// kör `requireAdminForAction()` FÖRST (404/401-liknande beteende hanteras
// redan av sidan — här kastar vi bara om sessionen skulle ha tappat sin
// aal2 mellan sidladdning och knapptryck) och skriver sedan en rad i
// `private.admin_audit_log` (se respektive `src/server/admin/*`-funktion).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ImportApplyResult } from "@/lib/validation/import";
import { requireAdminForAction } from "@/server/admin/auth";
import { setAdminBusinessPlace } from "@/server/admin/business-place";
import {
  adminCancelDeletion,
  adminDeleteNow,
  adminRequestDeletion,
  changeEmail,
  freezeBusiness,
  sendLoginLink,
  setBillingMode,
  setMarketplaceHidden,
  setPlan,
  unfreezeBusiness,
  type AdminActionResult,
  type BillingMode,
  type BusinessPlan,
} from "@/server/admin/businesses";
import { adminApplyImport } from "@/server/admin/import";
import { startSupport } from "@/server/admin/support";

async function afterAction(businessId: string): Promise<void> {
  revalidatePath(`/admin/negocios/${businessId}`);
  revalidatePath("/admin");
}

export async function setPlanAction(
  businessId: string,
  plan: BusinessPlan,
  overrideUntil: string | null,
  customLimits: { staff?: number } | null = null,
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

/** WP-84 (D-069): importen från förra bokningssystemet, åt företaget. */
export async function adminImportAction(
  businessId: string,
  input: unknown,
): Promise<ImportApplyResult> {
  const admin = await requireAdminForAction();
  const result = await adminApplyImport(admin.userId, businessId, input);
  await afterAction(businessId);
  return result;
}

/** WP-84 (D-069): "Rubro y ubicación" (rubro, comuna, dirección). */
export async function setBusinessPlaceAction(
  businessId: string,
  input: unknown,
): Promise<AdminActionResult> {
  const admin = await requireAdminForAction();
  const result = await setAdminBusinessPlace(admin.userId, businessId, input);
  await afterAction(businessId);
  return result;
}

/** WP-80 (D-061): "Facturación manual" + intern anteckning. */
export async function setBillingModeAction(
  businessId: string,
  mode: BillingMode,
  note: string | null,
): Promise<AdminActionResult> {
  const admin = await requireAdminForAction();
  const result = await setBillingMode(admin.userId, businessId, mode, note);
  await afterAction(businessId);
  return result;
}

/** Döljer/visar företaget i Descubre (demo- och testföretag). */
export async function setMarketplaceHiddenAction(
  businessId: string,
  hidden: boolean,
): Promise<AdminActionResult> {
  const admin = await requireAdminForAction();
  if (typeof hidden !== "boolean") return { ok: false, code: "invalid_input" };
  const result = await setMarketplaceHidden(admin.userId, businessId, hidden);
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

/** WP-84 (D-069): radera direkt, med slug som bekräftelse. */
export async function deleteNowAction(
  businessId: string,
  confirmSlug: string,
): Promise<AdminActionResult> {
  const admin = await requireAdminForAction();
  const result = await adminDeleteNow(admin.userId, businessId, confirmSlug);
  revalidatePath("/admin");
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

/** WP-90 (D-076): abrir el panel del negocio en modo soporte (60 minutos).
 * Kräver tvåstegsverifiering som alla adminåtgärder. Fel visas på samma sida. */
export async function startSupportAction(businessId: string): Promise<void> {
  const admin = await requireAdminForAction();
  const r = await startSupport(admin.userId, businessId);
  if (!r.ok) {
    redirect(`/admin/negocios/${businessId}?soporte=${r.code}`);
  }
  redirect("/app");
}
