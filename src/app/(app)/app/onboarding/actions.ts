"use server";

// Server action: onboarding i ett steg (F1, WP-15 slim). `userId` läses ur den verifierade
// sessionen här inne — aldrig från klienten (samma regel som /[slug]/actions.ts, men här
// räcker en vanlig "use server"-export: det finns inget "fritt" värde som slug att binda,
// completeOnboarding() hämtar alltid en färsk, verifierad userId).
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import {
  completeOnboarding,
  type OnboardingResult,
} from "@/server/onboarding/complete-onboarding";
import {
  confirmImageUpload,
  createImageUpload,
  deleteImage,
  updateBusinessProfile,
  type DeleteImageTarget,
  type ImageUploadTicket,
  type ProfileResult,
} from "@/server/owner/profile";

export async function submitOnboarding(
  input: unknown,
): Promise<OnboardingResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "unauthorized" };
  return completeOnboarding(user.id, input);
}

// ---------------------------------------------------------------------------
// Paso "Tu página" (WP-51): se onboarding-wizard.tsx. El negocio ya existe
// en la base de datos en este punto (creado por `submitOnboarding` arriba),
// así que esto reutiliza los MISMOS server actions que Ajustes → Perfil
// (`src/server/owner/profile.ts`, no tocado acá) en vez de duplicar lógica
// — mismo mönster que `./ajustes/profile-actions.ts`, pero con
// `getCurrentMember` acá adentro (no hay una `businessId` "libre" que el
// cliente pueda mandar, regla dura 2).
// ---------------------------------------------------------------------------

async function currentOwner(): Promise<
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

export async function createPageImageUploadAction(
  input: unknown,
): Promise<ImageUploadTicket | { ok: false; code: string }> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return createImageUpload(owner.userId, owner.businessId, input);
}

export async function confirmPageImageUploadAction(
  input: unknown,
): Promise<
  { ok: true; url: string; imageId?: string } | { ok: false; code: string }
> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return confirmImageUpload(owner.userId, owner.businessId, input);
}

export async function deletePageImageAction(
  target: DeleteImageTarget,
): Promise<ProfileResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return deleteImage(owner.userId, owner.businessId, target);
}

/** Texterna i "Tu página" (dirección, Instagram/TikTok/Facebook — `about` se
 * manda vacío, el negocio es nuevo, y `phone` se repite tal cual vino del
 * paso 1, para no borrarlo: `updateBusinessProfile` siempre escribe las
 * cuatro columnas juntas, ver `src/server/owner/profile.ts`).
 *
 * CONOCIDO (flaggat, inte löst här — utanför WP-51:s scope): el esquema del
 * servidor (`businessProfileInputSchema`, `src/lib/validation/profile.ts`)
 * todavía no acepta `tiktok`/`facebook` aunque las columnas ya existen
 * (`20260930170100_business_social_links_and_staff_self_profile.sql`) — esos
 * dos campos se envían igual (Zod los descarta en silencio, no falla) para
 * que el formulario quede listo en cuanto alguien actualice ese esquema. */
export async function updatePageProfileAction(
  input: unknown,
): Promise<ProfileResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return updateBusinessProfile(owner.userId, owner.businessId, input);
}
