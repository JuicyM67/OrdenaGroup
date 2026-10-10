"use server";

// WP-76 (D-053): köp av sms-krediter. `userId`/`businessId` läses ur den
// verifierade sessionen, aldrig från klienten; klienten skickar bara
// paketstorleken. Ägarkontroll, pris och Stripe-sessionen sköts av
// `createSmsCreditCheckout`.
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createSmsCreditCheckout,
  type SmsCheckoutResult,
} from "@/server/billing/sms-credits";
import { getCurrentMember } from "@/server/onboarding/owner-business";

export type BuySmsCreditsResult =
  | { ok: true; url: string }
  | {
      ok: false;
      code: Extract<SmsCheckoutResult, { ok: false }>["code"] | "unauthorized";
    };

export async function buySmsCreditsAction(
  packageSize: unknown,
): Promise<BuySmsCreditsResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "unauthorized" };
  const current = await getCurrentMember(user.id);
  if (!current) return { ok: false, code: "unauthorized" };
  return createSmsCreditCheckout({
    businessId: current.business.id,
    userId: user.id,
    email: user.email ?? null,
    packageSize,
  });
}
