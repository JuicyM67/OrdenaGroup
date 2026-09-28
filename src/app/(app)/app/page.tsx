// /app: enda jobbet är att skicka ägaren vidare (WP-15). Med företag → /app/inicio (D-020,
// fixtures tills WP-21). Utan företag → /app/onboarding. Inloggning krävs redan av
// src/app/(app)/layout.tsx.
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnerBusiness } from "@/server/onboarding/owner-business";

export const dynamic = "force-dynamic";

export default async function AppIndexPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await getOwnerBusiness(user.id);
  redirect(business ? "/app/inicio" : "/app/onboarding");
}
