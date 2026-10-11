"use server";

// WP-76 (D-053): köp av sms-krediter. `userId`/`businessId` läses ur den
// verifierade sessionen, aldrig från klienten; klienten skickar bara
// paketstorleken. Ägarkontroll, pris och Stripe-sessionen sköts av
// `createSmsCreditCheckout`.
import { APP_TZ, formatLocalDate, toLocalDate } from "@/lib/format/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  BillingActionResult,
  PlanChangePreview,
} from "@/lib/validation/billing";
import {
  createSmsCreditCheckout,
  type SmsCheckoutResult,
} from "@/server/billing/sms-credits";
import {
  cancelSubscription,
  changePlan,
  openPortal,
  previewChange,
  resumeSubscription,
  startSubscriptionCheckout,
} from "@/server/billing/subscriptions";
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

// ---------------------------------------------------------------------------
// WP-78 (D-059): abonnemang. Samma mönster: användare och företag ur den
// verifierade sessionen; klienten skickar bara planens id. Ägarkontroll,
// `billingAvailable()`, rate limit och priser sköts i
// `src/server/billing/subscriptions/`.
// ---------------------------------------------------------------------------

async function sessionOwner(): Promise<{
  userId: string;
  email: string | null;
  businessId: string;
} | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const current = await getCurrentMember(user.id);
  if (!current) return null;
  return {
    userId: user.id,
    email: user.email ?? null,
    businessId: current.business.id,
  };
}

const UNAUTHORIZED = { ok: false as const, code: "unauthorized" as const };

export async function startSubscriptionAction(
  plan: unknown,
): Promise<BillingActionResult> {
  const s = await sessionOwner();
  if (!s) return UNAUTHORIZED;
  return startSubscriptionCheckout({ ...s, plan });
}

export async function previewPlanChangeAction(
  plan: unknown,
): Promise<
  { ok: true; preview: PlanChangePreview } | { ok: false; code: string }
> {
  const s = await sessionOwner();
  if (!s) return UNAUTHORIZED;
  const r = await previewChange({ ...s, plan });
  if (!r.ok) return r;
  const at = r.preview.effectiveAt;
  return {
    ok: true,
    preview: {
      ...r.preview,
      ...(at
        ? {
            effectiveLabel: formatLocalDate(
              toLocalDate(new Date(at), APP_TZ),
              "dayMonthLong",
            ),
          }
        : {}),
    },
  };
}

export async function changePlanAction(
  plan: unknown,
): Promise<BillingActionResult> {
  const s = await sessionOwner();
  if (!s) return UNAUTHORIZED;
  return changePlan({ ...s, plan });
}

export async function cancelSubscriptionAction(): Promise<BillingActionResult> {
  const s = await sessionOwner();
  if (!s) return UNAUTHORIZED;
  return cancelSubscription(s);
}

export async function resumeSubscriptionAction(): Promise<BillingActionResult> {
  const s = await sessionOwner();
  if (!s) return UNAUTHORIZED;
  return resumeSubscription(s);
}

export async function openBillingPortalAction(): Promise<BillingActionResult> {
  const s = await sessionOwner();
  if (!s) return UNAUTHORIZED;
  return openPortal(s);
}
