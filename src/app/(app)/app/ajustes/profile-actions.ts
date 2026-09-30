"use server";

// Server actions för "Ajustes → Perfil" (WP-41 steg 4). Samma mönster som
// ./actions.ts/./booking-form-actions.ts: `userId`/`businessId` kommer alltid
// från den verifierade sessionen här inne, aldrig från klienten. Tunna
// omslag runt `src/server/owner/profile.ts` (redan byggd, WP-41 steg 2) —
// ingen ny affärslogik här.
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import {
  confirmImageUpload,
  createImageUpload,
  deleteImage,
  loadProfileSettings,
  reorderImages,
  updateBusinessProfile,
  updateStaffTitle,
  type DeleteImageTarget,
  type ImageUploadTicket,
  type ProfileResult,
  type ProfileSettings,
} from "@/server/owner/profile";

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

export async function loadProfileSettingsAction(): Promise<
  { ok: true; data: ProfileSettings } | { ok: false; code: string }
> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  const data = await loadProfileSettings(owner.userId, owner.businessId);
  return { ok: true, data };
}

export async function updateBusinessProfileAction(
  input: unknown,
): Promise<ProfileResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return updateBusinessProfile(owner.userId, owner.businessId, input);
}

export async function updateStaffTitleAction(
  staffId: string,
  title: unknown,
): Promise<ProfileResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return updateStaffTitle(owner.userId, owner.businessId, staffId, title);
}

export async function createImageUploadAction(
  input: unknown,
): Promise<ImageUploadTicket | { ok: false; code: string }> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return createImageUpload(owner.userId, owner.businessId, input);
}

export async function confirmImageUploadAction(
  input: unknown,
): Promise<
  { ok: true; url: string; imageId?: string } | { ok: false; code: string }
> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return confirmImageUpload(owner.userId, owner.businessId, input);
}

export async function deleteImageAction(
  target: DeleteImageTarget,
): Promise<ProfileResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return deleteImage(owner.userId, owner.businessId, target);
}

export async function reorderImagesAction(
  ids: unknown,
): Promise<ProfileResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return reorderImages(owner.userId, owner.businessId, ids);
}
