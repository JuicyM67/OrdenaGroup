"use server";

// "Min profil" (WP-46 steg 6, UserMenu): server actions delade av Inicio,
// Hoy och Ajustes (alla tre renderar `UserMenu`). `userId`/`businessId`
// läses ur sessionen + `getCurrentMember` här, aldrig från klienten — samma
// mönster som `./ajustes/team-actions.ts`.
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import {
  confirmOwnPhotoUpload,
  createOwnPhotoUpload,
  deleteOwnPhoto,
  loadMyProfile,
  updateOwnTitle,
  type MyProfile,
} from "@/server/team/profile";

async function currentUserBusiness(): Promise<
  { userId: string; businessId: string } | { ok: false; code: "unauthorized" }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "unauthorized" };
  const current = await getCurrentMember(user.id);
  if (!current) return { ok: false, code: "unauthorized" };
  return { userId: user.id, businessId: current.business.id };
}

/** `null` = inloggad utan egen personalrad (t.ex. ägaren) — "Mi perfil" döljs då. */
export async function loadMyProfileAction(): Promise<MyProfile | null> {
  const ctx = await currentUserBusiness();
  if ("ok" in ctx) return null;
  return loadMyProfile(ctx.userId, ctx.businessId);
}

export async function updateMyTitleAction(
  title: unknown,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const ctx = await currentUserBusiness();
  if ("ok" in ctx) return ctx;
  return updateOwnTitle(ctx.userId, ctx.businessId, title);
}

export async function createMyPhotoUploadAction(
  contentType: unknown,
): Promise<
  | { ok: true; path: string; signedUrl: string; token: string }
  | { ok: false; code: string }
> {
  const ctx = await currentUserBusiness();
  if ("ok" in ctx) return ctx;
  return createOwnPhotoUpload(ctx.userId, ctx.businessId, contentType);
}

export async function confirmMyPhotoUploadAction(
  path: unknown,
): Promise<{ ok: true; url: string } | { ok: false; code: string }> {
  const ctx = await currentUserBusiness();
  if ("ok" in ctx) return ctx;
  return confirmOwnPhotoUpload(ctx.userId, ctx.businessId, path);
}

export async function deleteMyPhotoAction(): Promise<
  { ok: true } | { ok: false; code: string }
> {
  const ctx = await currentUserBusiness();
  if ("ok" in ctx) return ctx;
  return deleteOwnPhoto(ctx.userId, ctx.businessId);
}
