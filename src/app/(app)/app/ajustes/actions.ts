"use server";

// Server actions för Ajustes (WP-15b slim): varje anrop läser `userId` ur den verifierade
// sessionen och `businessId` via `getOwnerBusiness` här inne — aldrig från klienten (samma
// regel som src/app/(app)/app/onboarding/actions.ts). `src/server/owner/ajustes.ts` validerar
// indata på nytt (Zod) och skriver via `withOwnerTx` (RLS/D-019).
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createService,
  createStaff,
  loadAjustesData,
  replaceBusinessHours,
  setServiceActive,
  setStaffActive,
  updateBusinessSettings,
  updateService,
  updateStaff,
  type AjustesData,
  type CreateResult,
  type MutationResult,
} from "@/server/owner/ajustes";
import { getOwnerBusiness } from "@/server/onboarding/owner-business";

async function currentOwner(): Promise<
  { userId: string; businessId: string } | { ok: false; code: "unauthorized" }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "unauthorized" };
  const business = await getOwnerBusiness(user.id);
  if (!business) return { ok: false, code: "unauthorized" };
  return { userId: user.id, businessId: business.id };
}

export async function reloadAjustesData(): Promise<
  { ok: true; data: AjustesData } | { ok: false; code: string }
> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  const data = await loadAjustesData(owner.userId, owner.businessId);
  return { ok: true, data };
}

export async function updateBusinessSettingsAction(
  input: unknown,
): Promise<MutationResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return updateBusinessSettings(owner.userId, owner.businessId, input);
}

export async function createServiceAction(
  input: unknown,
): Promise<CreateResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return createService(owner.userId, owner.businessId, input);
}

export async function updateServiceAction(
  serviceId: string,
  input: unknown,
): Promise<MutationResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return updateService(owner.userId, owner.businessId, serviceId, input);
}

export async function setServiceActiveAction(
  serviceId: string,
  active: boolean,
): Promise<MutationResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return setServiceActive(owner.userId, owner.businessId, serviceId, active);
}

export async function createStaffAction(input: unknown): Promise<CreateResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return createStaff(owner.userId, owner.businessId, input);
}

export async function updateStaffAction(
  staffId: string,
  input: unknown,
): Promise<MutationResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return updateStaff(owner.userId, owner.businessId, staffId, input);
}

export async function setStaffActiveAction(
  staffId: string,
  active: boolean,
): Promise<MutationResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return setStaffActive(owner.userId, owner.businessId, staffId, active);
}

export async function updateHoursAction(
  input: unknown,
): Promise<MutationResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return replaceBusinessHours(owner.userId, owner.businessId, input);
}
