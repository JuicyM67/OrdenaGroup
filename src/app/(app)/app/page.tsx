// /app: enda jobbet är att skicka ägaren vidare (WP-15). Med företag → /app/inicio (D-020,
// fixtures tills WP-21). Utan företag → /app/onboarding. Inloggning krävs redan av
// src/app/(app)/layout.tsx.
//
// WP-46: om personen nyss bad om en magisk länk från /app/invitacion/[token]
// (utloggad), skickas hen hit av `/auth/confirm` som vanligt — den rutten
// stödjer medvetet ingen `?next=` (öppen omdirigering). En cookie
// (`pending_invitation`, satt av invitationssidans egen server action, bara
// ett redan formatvaliderat token) tar över härifrån i stället.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnerBusiness } from "@/server/onboarding/owner-business";

export const dynamic = "force-dynamic";

const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;

export default async function AppIndexPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const store = await cookies();
  const pending = store.get("pending_invitation")?.value;
  if (pending && TOKEN_RE.test(pending)) {
    // `cookies().delete()` kastar i en ren Server Component (bara Server
    // Actions/Route Handlers får skriva cookies) — samma tolerans som
    // `@/lib/supabase/server`s `setAll`. Cookien går ut av sig själv (15 min)
    // om den här raden inte får skriva; ingen loop (accept-sidan sätter den
    // aldrig på nytt av sig själv).
    try {
      store.delete("pending_invitation");
    } catch {
      // se kommentaren ovan
    }
    redirect(`/app/invitacion/${pending}`);
  }

  const business = await getOwnerBusiness(user.id);
  redirect(business ? "/app/inicio" : "/app/onboarding");
}
