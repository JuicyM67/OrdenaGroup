"use server";

// Skylteditorn (WP-96, D-080): sparar en skylts design. `userId` ur den verifierade
// sessionen och `businessId` via `getCurrentMember`, aldrig från klienten. Servern
// validerar designen strikt och kräver `can_edit_settings`.
import { revalidatePath } from "next/cache";

import { appHref } from "@/config/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cartelKindSchema } from "@/lib/validation/carteles";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import {
  saveSignDesign,
  type SaveSignDesignResult,
} from "@/server/owner/carteles";

export async function saveSignDesignAction(
  kind: unknown,
  design: unknown,
): Promise<SaveSignDesignResult> {
  const parsedKind = cartelKindSchema.safeParse(kind);
  if (!parsedKind.success) return { ok: false, code: "invalid" };
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "unauthorized" };
  const current = await getCurrentMember(user.id);
  if (!current) return { ok: false, code: "unauthorized" };
  const result = await saveSignDesign(
    user.id,
    current.business.id,
    parsedKind.data,
    design,
  );
  if (result.ok) revalidatePath(appHref("appAjustesQr"));
  return result;
}
