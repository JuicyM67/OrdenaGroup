"use server";

// Server actions för "Ajustes → Privacidad y datos" (WP-26 steg 7, F12). Samma mönster
// som ./actions.ts/./profile-actions.ts: `userId`/`businessId` kommer alltid från den
// verifierade sessionen här inne, aldrig från klienten. Tunna omslag runt
// `src/server/privacy/business.ts` (redan byggd, WP-26 steg 3) — ingen ny affärslogik här.
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import {
  cancelBusinessDeletion,
  exportBusiness,
  getBusinessDeletionStatus,
  requestBusinessDeletion,
  type BusinessExportData,
  type DeletionStatusResult,
} from "@/server/privacy/business";
import type { MutationResult } from "@/server/privacy/types";

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

export async function loadPrivacyStatusAction(): Promise<DeletionStatusResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return getBusinessDeletionStatus(owner.userId, owner.businessId);
}

export async function exportBusinessAction(): Promise<
  { ok: true; data: BusinessExportData } | { ok: false; code: string }
> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return exportBusiness(owner.userId, owner.businessId);
}

export async function requestBusinessDeletionAction(): Promise<MutationResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return requestBusinessDeletion(owner.userId, owner.businessId);
}

export async function cancelBusinessDeletionAction(): Promise<MutationResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return cancelBusinessDeletion(owner.userId, owner.businessId);
}
