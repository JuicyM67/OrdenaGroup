"use server";

// WP-64 (D-044): server actions för fliken Betalningar. `userId`/`businessId`
// läses ur den verifierade sessionen, aldrig från klienten; varje funktion i
// `src/server/payments/stripe/settings.ts` kontrollerar att personen är ägare.
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import {
  beginStripeOnboarding,
  openStripeDashboard,
  setOnlinePaymentMode,
  type PaymentActionError,
} from "@/server/payments/stripe/settings";

type Session = { userId: string; businessId: string; businessName: string };

async function session(): Promise<Session | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const current = await getCurrentMember(user.id);
  if (!current) return null;
  return {
    userId: user.id,
    businessId: current.business.id,
    businessName: current.business.name,
  };
}

export type PagosActionResult =
  { ok: true } | { ok: false; code: PaymentActionError | "unauthorized" };

export type PagosRedirectResult =
  | { ok: true; url: string }
  | { ok: false; code: PaymentActionError | "unauthorized" };

export async function updateOnlinePaymentModeAction(
  mode: unknown,
): Promise<PagosActionResult> {
  const s = await session();
  if (!s) return { ok: false, code: "unauthorized" };
  return setOnlinePaymentMode(s.userId, s.businessId, mode);
}

export async function startStripeOnboardingAction(): Promise<PagosRedirectResult> {
  const s = await session();
  if (!s) return { ok: false, code: "unauthorized" };
  return beginStripeOnboarding(s.userId, s.businessId, s.businessName);
}

export async function openStripeDashboardAction(): Promise<PagosRedirectResult> {
  const s = await session();
  if (!s) return { ok: false, code: "unauthorized" };
  return openStripeDashboard(s.userId, s.businessId);
}
