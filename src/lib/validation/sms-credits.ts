/**
 * WP-76 (D-053): delat mellan servern (`src/server/billing/sms-credits/`) och
 * komponenterna (Plan-fliken, klockan). Zod-schemat används bara på servern
 * (server action); typerna får importeras av "use client"-filer.
 */
import { z } from "zod";

import { SMS_CREDIT_PACKAGE_SIZES } from "@/config/sms-credits";

/** Paketval från klienten — bara storleken; priset räknar servern. */
export const smsCreditPackageSchema = z
  .number()
  .int()
  .refine((n) => SMS_CREDIT_PACKAGE_SIZES.includes(n as 100), {
    message: "sms_credits_invalid_package",
  });

/** En notis i klockan (härleds ur månadens varningsmejl, `notices.ts`). */
export type SmsBellNotice = { readonly kind: "smsCuota80" | "smsAgotados" };

export type SmsCreditHistoryRow = {
  readonly id: string;
  /** ISO 8601. */
  readonly at: string;
  readonly kind: "purchase" | "usage";
  /** Köp: paketstorlek; förbrukning: antal krediter (positivt). */
  readonly credits: number;
  /** Köp: belopp inkl. moms i öre. */
  readonly amountTotalOre?: number;
  readonly status?:
    "paid" | "pending" | "refunded" | "partially_refunded" | "expired";
  /** Förbrukning: månaden (`YYYY-MM-01`, installationens tidszon). */
  readonly month?: string;
  /** Köp: Stripes kvittosida. */
  readonly receiptUrl?: string;
};
