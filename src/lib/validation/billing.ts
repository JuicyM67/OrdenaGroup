/**
 * WP-78 (D-059): delat mellan servern (`src/server/billing/subscriptions/`)
 * och Plan-fliken. Zod-schemat används bara på servern (server actions);
 * typerna får importeras av "use client"-filer.
 */
import { z } from "zod";

/** Betalda planer som kan köpas via Stripe (inte `free`/`custom`). */
export const PAID_PLANS = ["emprende", "equipo", "local"] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];

/** Planval från klienten — bara id:t; pris och belopp bestämmer servern. */
export const paidPlanSchema = z.enum(PAID_PLANS);

export function isPaidPlan(v: unknown): v is PaidPlan {
  return paidPlanSchema.safeParse(v).success;
}

export const BILLING_ERROR_CODES = [
  "billing_unavailable",
  "billing_not_owner",
  "billing_custom_plan",
  "billing_payment_required",
  "billing_already_subscribed",
  "billing_no_subscription",
  "billing_invalid_plan",
  "billing_same_plan",
  "rate_limited",
  "failed",
] as const;
export type BillingErrorCode = (typeof BILLING_ERROR_CODES)[number];

export type BillingStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "paused";

/** Förhandsvisning av ett planbyte (belopp i öre, inkl. moms). */
export type PlanChangePreview = {
  readonly direction: "upgrade" | "downgrade" | "trial";
  /** Att betala i dag (uppgradering, proration), annars 0. */
  readonly dueTodayOre: number;
  /** Nästa ordinarie månadsbelopp inkl. moms. */
  readonly nextAmountOre: number;
  /** Momsen i nästa ordinarie belopp. */
  readonly nextVatOre: number;
  /** ISO 8601: när nedgraderingen gäller / nästa faktura. */
  readonly effectiveAt: string | null;
};

export type BillingActionResult =
  | { ok: true; url?: string }
  | { ok: false; code: BillingErrorCode | "unauthorized" };
