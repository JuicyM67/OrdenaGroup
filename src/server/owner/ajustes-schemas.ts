import "server-only";

/**
 * Serverns valideringsschema för Ajustes (WP-15b slim, F1/F2/F3 efter onboarding).
 * Bygger vidare på `src/server/onboarding/schemas.ts` — samma slug-regler, reserverade
 * namn och fältgränser som onboarding, så att en ägare aldrig kan spara ett värde i
 * Ajustes som skulle ha avvisats i onboarding. Felkoder är samma alfabet som
 * onboarding ("business.slug_invalid", "services.name_empty" …) plus ett fåtal nya
 * för fälten som bara finns i Ajustes (reglerna, buffert). Ingen spansk text här —
 * `src/components/settings/error-text.ts` mappar koderna.
 */
import { z } from "zod";

import { phoneInputSchema } from "@/lib/format/schemas";
import { serviceDescriptionSchema } from "@/lib/validation/profile";
import {
  businessNameSchema,
  comunaSchema,
  hoursInputSchema,
  serviceInputSchema,
  slugSchema,
  staffNameSchema,
} from "@/server/onboarding/schemas";

const UUID = z.uuid({ error: "invalid_input" });

const addressSchema = z
  .string({ error: "business.address_invalid_type" })
  .trim()
  .max(200, { error: "business.address_too_long" })
  .optional()
  .or(z.literal(""));

// Samma gränser som `businesses_min_notice_minutes_check` /
// `businesses_max_days_ahead_check` / `businesses_cancel_window_hours_check`
// (20260927100100_businesses_memberships.sql).
const minNoticeMinutesSchema = z.coerce
  .number({ error: "business.min_notice_invalid" })
  .int({ error: "business.min_notice_invalid" })
  .min(0, { error: "business.min_notice_invalid" })
  .max(10_080, { error: "business.min_notice_invalid" });

const maxDaysAheadSchema = z.coerce
  .number({ error: "business.max_days_ahead_invalid" })
  .int({ error: "business.max_days_ahead_invalid" })
  .min(1, { error: "business.max_days_ahead_invalid" })
  .max(365, { error: "business.max_days_ahead_invalid" });

const cancelWindowHoursSchema = z.coerce
  .number({ error: "business.cancel_window_invalid" })
  .int({ error: "business.cancel_window_invalid" })
  .min(0, { error: "business.cancel_window_invalid" })
  .max(168, { error: "business.cancel_window_invalid" });

// `businesses_slot_interval_minutes_check`: bara dessa sex värden.
const SLOT_INTERVALS = [5, 10, 15, 20, 30, 60] as const;
const slotIntervalMinutesSchema = z.coerce
  .number({ error: "business.slot_interval_invalid" })
  .check((ctx) => {
    if (!(SLOT_INTERVALS as readonly number[]).includes(ctx.value)) {
      ctx.issues.push({
        code: "custom",
        message: "business.slot_interval_invalid",
        input: ctx.value,
      });
    }
  });

// WP-56: `businesses_cancel_approval_check` (none|late|all).
const cancelApprovalSchema = z.enum(["none", "late", "all"], {
  error: "business.cancel_approval_invalid",
});

export const businessSettingsInputSchema = z.object({
  name: businessNameSchema,
  slug: slugSchema,
  comuna: comunaSchema,
  phone: phoneInputSchema,
  address: addressSchema,
  minNoticeMinutes: minNoticeMinutesSchema,
  maxDaysAhead: maxDaysAheadSchema,
  cancelWindowHours: cancelWindowHoursSchema,
  slotIntervalMinutes: slotIntervalMinutesSchema,
  // WP-45 (D-033): "Confirmar reservas automáticamente".
  autoConfirmBookings: z.boolean({ error: "business.auto_confirm_invalid" }),
  // WP-56: "Cancelaciones del cliente".
  cancelApproval: cancelApprovalSchema,
});
export type BusinessSettingsInput = z.infer<typeof businessSettingsInputSchema>;

const bufferAfterMinSchema = z.coerce
  .number({ error: "services.buffer_invalid" })
  .int({ error: "services.buffer_invalid" })
  .min(0, { error: "services.buffer_invalid" })
  .max(600, { error: "services.buffer_invalid" });

export const ajustesServiceInputSchema = serviceInputSchema.extend({
  bufferAfterMin: bufferAfterMinSchema,
  // WP-41: frivillig. Utelämnad = oförändrad vid uppdatering, "" = rensa.
  description: serviceDescriptionSchema.optional(),
});
export type AjustesServiceInput = z.infer<typeof ajustesServiceInputSchema>;

export const ajustesStaffInputSchema = z.object({
  name: staffNameSchema,
  serviceIds: z.array(UUID).max(200),
});
export type AjustesStaffInput = z.infer<typeof ajustesStaffInputSchema>;

// WP-54 (Ajustes → Socios): `businesses_member_discount_pct_check`/
// `businesses_member_benefit_text_length_check`
// (20260930210200_businesses_member_benefit.sql). `enabled = false` →
// servern sparar `member_discount_pct`/`member_benefit_text` som `null`,
// oavsett vad klienten skickade i de fälten (se `updateMemberSettings`).
export const memberSettingsInputSchema = z
  .object({
    enabled: z.boolean({ error: "member.enabled_invalid" }),
    discountPct: z.coerce
      .number({ error: "member.discount_invalid" })
      .int({ error: "member.discount_invalid" })
      .min(1, { error: "member.discount_invalid" })
      .max(100, { error: "member.discount_invalid" })
      .optional(),
    benefitText: z
      .string({ error: "member.benefit_invalid_type" })
      .trim()
      .max(140, { error: "member.benefit_too_long" })
      .optional()
      .or(z.literal("")),
  })
  .check((ctx) => {
    if (ctx.value.enabled && ctx.value.discountPct === undefined) {
      ctx.issues.push({
        code: "custom",
        message: "member.discount_invalid",
        input: ctx.value,
      });
    }
  });
export type MemberSettingsInput = z.infer<typeof memberSettingsInputSchema>;

export const ajustesHoursInputSchema = z
  .array(hoursInputSchema)
  .max(7)
  .check((ctx) => {
    const weekdays = new Set(ctx.value.map((h) => h.weekday));
    if (weekdays.size !== ctx.value.length) {
      ctx.issues.push({
        code: "custom",
        message: "hours.weekday_duplicate",
        input: ctx.value,
      });
    }
  });
export type AjustesHoursInput = z.infer<typeof ajustesHoursInputSchema>;
