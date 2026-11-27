"use server";

// WP-98 (D-082): byta aktivt företag från profilmenyn. Företags-id:t kommer
// från klienten men är bara en önskan: det sparas bara om kontot är medlem
// (inte som support), och `getCurrentMember` kontrollerar det igen vid varje
// läsning.
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isMyBusiness,
  setActiveBusinessCookie,
} from "@/server/onboarding/owner-business";

export async function switchBusinessAction(businessId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (await isMyBusiness(user.id, businessId)) {
    await setActiveBusinessCookie(businessId);
  }
  // /app väljer startskärm efter roll och behörigheter i det nya företaget.
  redirect("/app");
}
