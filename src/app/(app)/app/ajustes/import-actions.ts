"use server";

// WP-66: "Importar lo seleccionado" (Ajustes → Negocio). `userId`/`businessId`
// läses ur sessionen här inne, aldrig från klienten; `applyImport` validerar
// urvalet på nytt och kräver ägaren (samma mönster som ./actions.ts).
import type { ImportApplyResult } from "@/lib/validation/import";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyImport } from "@/server/import/apply";
import { getCurrentMember } from "@/server/onboarding/owner-business";

export async function applyImportAction(
  input: unknown,
): Promise<ImportApplyResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "unauthorized" };
  const current = await getCurrentMember(user.id);
  if (!current) return { ok: false, code: "unauthorized" };
  return applyImport(user.id, current.business.id, input);
}
