"use server";

// Server action: onboarding i ett steg (F1, WP-15 slim). `userId` läses ur den verifierade
// sessionen här inne — aldrig från klienten (samma regel som /[slug]/actions.ts, men här
// räcker en vanlig "use server"-export: det finns inget "fritt" värde som slug att binda,
// completeOnboarding() hämtar alltid en färsk, verifierad userId).
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  completeOnboarding,
  type OnboardingResult,
} from "@/server/onboarding/complete-onboarding";

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
