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
  updateMemberSettings,
  updateService,
  updateStaff,
  updateWaitlistSettings,
  updateWinbackSettings,
  type AjustesData,
  type CreateResult,
  type MutationResult,
} from "@/server/owner/ajustes";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import {
  approveCancelRequest,
  confirmRequest,
  declineCancelRequest,
  declineRequest,
} from "@/server/owner/requests";

async function currentOwner(): Promise<
  { userId: string; businessId: string } | { ok: false; code: "unauthorized" }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "unauthorized" };
  // WP-46: ägare ELLER personal; varje server-funktion kontrollerar sedan
  // flaggan själv (`forbidden` om den saknas).
  const current = await getCurrentMember(user.id);
  if (!current) return { ok: false, code: "unauthorized" };
  return { userId: user.id, businessId: current.business.id };
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

export async function updateMemberSettingsAction(
  input: unknown,
): Promise<MutationResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return updateMemberSettings(owner.userId, owner.businessId, input);
}

export async function updateWinbackSettingsAction(
  input: unknown,
): Promise<MutationResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return updateWinbackSettings(owner.userId, owner.businessId, input);
}

export async function updateWaitlistSettingsAction(
  input: unknown,
): Promise<MutationResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return updateWaitlistSettings(owner.userId, owner.businessId, input);
}

// WP-45 (D-033): klockan i Ajustes topprad.
export async function confirmRequestAction(
  bookingId: string,
): Promise<{ ok: boolean }> {
  const owner = await currentOwner();
  if ("ok" in owner) return { ok: false };
  const result = await confirmRequest(
    owner.userId,
    owner.businessId,
    new Date(),
    bookingId,
  );
  return { ok: result.ok };
}

export async function declineRequestAction(
  bookingId: string,
  reason?: string,
): Promise<{ ok: boolean }> {
  const owner = await currentOwner();
  if ("ok" in owner) return { ok: false };
  const result = await declineRequest(
    owner.userId,
    owner.businessId,
    new Date(),
    bookingId,
    reason,
  );
  return { ok: result.ok };
}

// WP-56: "Aprobar cancelación"/"Rechazar" i klockan.
export async function approveCancelRequestAction(
  bookingId: string,
): Promise<{ ok: boolean }> {
  const owner = await currentOwner();
  if ("ok" in owner) return { ok: false };
  const result = await approveCancelRequest(
    owner.userId,
    owner.businessId,
    new Date(),
    bookingId,
  );
  return { ok: result.ok };
}

export async function declineCancelRequestAction(
  bookingId: string,
): Promise<{ ok: boolean }> {
  const owner = await currentOwner();
  if ("ok" in owner) return { ok: false };
  const result = await declineCancelRequest(
    owner.userId,
    owner.businessId,
    new Date(),
    bookingId,
  );
  return { ok: result.ok };
}
