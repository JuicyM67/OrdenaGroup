// /app/ajustes (WP-55): pekar om till den första flik den inloggade får se
// (`/app/ajustes/negocio`, `/perfil`, … — se `access.ts`/`ajustes-tabs.tsx`). Ajustes var
// tidigare en enda lång skärm med alla sektioner staplade som kort (WP-15b); ägarens
// feedback 2026-09-30 ("extremt lång — bättre att separera i flikar") delade upp den i nio
// egna rutter under den här mappen.
import { redirect } from "next/navigation";

import { firstAjustesTabHref } from "@/components/settings/ajustes-tabs";
import { appHref } from "@/config/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/onboarding/owner-business";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getCurrentMember(user.id);
  if (!current) redirect(appHref("appOnboarding"));

  const href = firstAjustesTabHref(current.view);
  redirect(href ?? appHref("appAgenda"));
}
