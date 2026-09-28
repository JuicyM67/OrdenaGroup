"use server";

// Utloggning (WP-15). Anropas som en riktig <form action={logout}> (fungerar utan JS),
// t.ex. från onboarding-headern (src/components/onboarding/session-bar.tsx).
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
