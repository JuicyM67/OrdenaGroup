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
  // WP-84 (D-069): precio "desde". Utelämnad = oförändrad vid uppdatering, av vid ny.
  priceFrom: z.boolean({ error: "invalid_input" }).optional(),
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

// WP-31 (Ajustes → Socios y envíos): "Te echamos de menos" automático —
// `businesses_winback_days_check`/`businesses_winback_message_length_check`/
// `businesses_winback_offer_pct_check`/`businesses_winback_offer_days_check`
// (20261001120100_businesses_winback_settings.sql). `enabled = false` →
// servern guarda las cuatro columnas como `null` (mismo patrón que
// `updateMemberSettings`), sin importar qué haya en el resto del formulario.
export const winbackSettingsInputSchema = z
  .object({
    enabled: z.boolean({ error: "winback.enabled_invalid" }),
    days: z.coerce
      .number({ error: "winback.days_invalid" })
      .int({ error: "winback.days_invalid" })
      .min(30, { error: "winback.days_invalid" })
      .max(365, { error: "winback.days_invalid" })
      .optional(),
    message: z
      .string({ error: "winback.message_invalid_type" })
      .trim()
      .max(320, { error: "winback.message_too_long" })
      .optional()
      .or(z.literal("")),
    offerPct: z.coerce
      .number({ error: "winback.offer_pct_invalid" })
      .int({ error: "winback.offer_pct_invalid" })
      .min(1, { error: "winback.offer_pct_invalid" })
      .max(100, { error: "winback.offer_pct_invalid" })
      .optional(),
    offerDays: z.coerce
      .number({ error: "winback.offer_days_invalid" })
      .int({ error: "winback.offer_days_invalid" })
      .min(1, { error: "winback.offer_days_invalid" })
      .max(90, { error: "winback.offer_days_invalid" })
      .optional(),
  })
  .check((ctx) => {
    if (ctx.value.enabled && ctx.value.days === undefined) {
      ctx.issues.push({
        code: "custom",
        message: "winback.days_invalid",
        input: ctx.value,
      });
    }
    // El % y la validez van juntos: uno sin el otro no sirve para armar la
    // oferta (mismo criterio que `campaigns_offer_pct_check`, que sí permite
    // un % sin texto, pero acá además pedimos la validez porque no hay un
    // envío manual detrás que la complete).
    if (ctx.value.offerPct !== undefined && ctx.value.offerDays === undefined) {
      ctx.issues.push({
        code: "custom",
        message: "winback.offer_days_invalid",
        input: ctx.value,
      });
    }
    if (ctx.value.offerDays !== undefined && ctx.value.offerPct === undefined) {
      ctx.issues.push({
        code: "custom",
        message: "winback.offer_pct_invalid",
        input: ctx.value,
      });
    }
  });
export type WinbackSettingsInput = z.infer<typeof winbackSettingsInputSchema>;

// WP-23 (Ajustes → Reglas de reserva): `businesses.waitlist_mode`/
// `waitlist_hold_minutes` (20261001150200_businesses_waitlist_hold_minutes.sql).
export const waitlistSettingsInputSchema = z.object({
  mode: z.enum(["sequential", "broadcast"], {
    error: "waitlist.mode_invalid",
  }),
  holdMinutes: z.coerce
    .number({ error: "waitlist.hold_minutes_invalid" })
    .int({ error: "waitlist.hold_minutes_invalid" })
    .min(5, { error: "waitlist.hold_minutes_invalid" })
    .max(240, { error: "waitlist.hold_minutes_invalid" }),
});
export type WaitlistSettingsInput = z.infer<typeof waitlistSettingsInputSchema>;

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
