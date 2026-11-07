import "server-only";

/**
 * Serverns valideringsschema för onboarding (F1, WP-15 slim). Återanvänder de delade
 * primitiverna i `src/lib/format/schemas.ts` (telefon, CLP, klockslag) för de fälten;
 * `name`/`slug`/`comuna`/`category` är specifika för den här domänen.
 *
 * Felkoder är `code: "custom"` med `message` = en punkterad kod ("business.slug_invalid",
 * "services.0.name_empty" …). `complete-onboarding.ts` mappar dem till UI-fel;
 * ingen spansk text här (samma mönster som `src/lib/format/schemas.ts`).
 */
import { z } from "zod";

import {
  localTimeSchema,
  moneyInputSchema,
  phoneInputSchema,
} from "@/lib/format/schemas";
import {
  serviceDescriptionSchema,
  staffTitleSchema,
} from "@/lib/validation/profile";

// Samma regex som `businesses_slug_format` (supabase/migrations/…businesses_memberships.sql):
// 3–40 tecken, gemener/siffror/bindestreck, börjar och slutar med gemen/siffra.
const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$/;

// Samma lista som `businesses_slug_not_reserved` i samma migration.
export const RESERVED_SLUGS = [
  "app",
  "api",
  "r",
  "admin",
  "vendedor",
  "login",
  "design-lab",
  "_next",
  "www",
  "auth",
  "static",
  "assets",
  "support",
  "help",
  "docs",
  "blog",
  "legal",
  "terminos",
  "privacidad",
  // WP-68 (D-055): marknadsplatsens toppsegment, båda språken.
  "descubre",
  "upptack",
  "oferta",
  "erbjudande",
  // WP-67: kundkonton (CL /cuenta, SE /konto).
  "cuenta",
  "konto",
  // WP-83 (D-068): registreringen för nya företag (/comenzar).
  "comenzar",
] as const;

// Samma nycklar som `negocio.rubros` (src/i18n/es-CL.ts). Hålls i synk manuellt (som
// `profesionales.colores` mot `staff.color`-checken i DB) — testat i schemas.test.ts.
export const RUBRO_KEYS = [
  "barberia",
  "peluqueria",
  "estetica",
  "unas",
  "cejas_pestanas",
  "masajes",
  "kinesiologia",
  "otro",
] as const;

// Exporterade (utöver onboardingInputSchema) så att src/server/owner/ajustes-schemas.ts
// (WP-15b) kan bygga vidare på exakt samma regler ("samma slug-regler och reserverade
// namn som onboarding") utan att duplicera dem.
export const businessNameSchema = z
  .string({ error: "business.name_invalid_type" })
  .trim()
  .min(1, { error: "business.name_empty" })
  .max(120, { error: "business.name_too_long" });

export const slugSchema = z
  .string({ error: "business.slug_invalid_type" })
  .check((ctx) => {
    const v = ctx.value;
    if (!SLUG_PATTERN.test(v)) {
      ctx.issues.push({
        code: "custom",
        message: "business.slug_invalid",
        input: v,
      });
      return;
    }
    if ((RESERVED_SLUGS as readonly string[]).includes(v)) {
      ctx.issues.push({
        code: "custom",
        message: "business.slug_reserved",
        input: v,
      });
    }
  });

export const comunaSchema = z
  .string({ error: "business.comuna_invalid_type" })
  .trim()
  .min(1, { error: "business.comuna_empty" })
  .max(80, { error: "business.comuna_too_long" });

const categorySchema = z.enum(RUBRO_KEYS, {
  error: "business.category_invalid",
});

export const businessInputSchema = z.object({
  name: businessNameSchema,
  slug: slugSchema,
  comuna: comunaSchema,
  category: categorySchema,
  phone: phoneInputSchema,
});

export const serviceInputSchema = z.object({
  name: z
    .string({ error: "services.name_invalid_type" })
    .trim()
    .min(1, { error: "services.name_empty" })
    .max(120, { error: "services.name_too_long" }),
  durationMin: z.coerce
    .number({ error: "services.duration_invalid" })
    .int({ error: "services.duration_invalid" })
    .min(5, { error: "services.duration_invalid" })
    .max(600, { error: "services.duration_invalid" }),
  // Minsta enheten (CLP: pesos).
  priceClp: moneyInputSchema,
});

export const staffNameSchema = z
  .string({ error: "staff.name_invalid_type" })
  .trim()
  .min(1, { error: "staff.name_empty" })
  .max(120, { error: "staff.name_too_long" });

// WP-66: beskrivning och kategori följer med när onboarding fylls från en
// import (frivilliga — det vanliga formuläret skickar dem inte).
const onboardingServiceInputSchema = serviceInputSchema.extend({
  description: serviceDescriptionSchema.optional(),
  category: z
    .string({ error: "services.category_invalid" })
    .trim()
    .max(60, { error: "services.category_invalid" })
    .optional(),
});

const staffInputSchema = z.object({
  name: staffNameSchema,
  // Index in i `services` (samma array som skickas i samma anrop).
  serviceIndexes: z.array(z.number().int().nonnegative()).max(200),
  // WP-66: titel från importen (frivillig).
  title: staffTitleSchema.optional(),
});

export const hoursInputSchema = z
  .object({
    weekday: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
      z.literal(7),
    ]),
    open: z.boolean(),
    start: localTimeSchema.optional(),
    end: localTimeSchema.optional(),
  })
  .check((ctx) => {
    const v = ctx.value;
    if (!v.open) return;
    if (!v.start || !v.end) {
      ctx.issues.push({
        code: "custom",
        message: "hours.range_required",
        input: v,
      });
      return;
    }
    if (v.start >= v.end) {
      ctx.issues.push({
        code: "custom",
        message: "hours.business_hours_start_before_end",
        input: v,
      });
    }
  });

/**
 * WP-26 steg 6: villkorsrutan i onboarding (allmänna villkor + biträdesavtal,
 * `/legal/terminos` + `/legal/encargo`). Fältnamn i indatan:
 * `acceptedTerms`, och servern godtar BARA `true` — rutan får aldrig vara
 * förkryssad i UI, så en saknad eller `false` avvisas med
 * `terms.not_accepted` (ingen rad skrivs). Loggas som `owner_terms` + `dpa`
 * i `consent_events` (complete-onboarding.ts).
 */
export const ONBOARDING_TERMS_FIELD = "acceptedTerms" as const;

export const acceptedTermsSchema = z.literal(true, {
  error: "terms.not_accepted",
});

export const onboardingInputSchema = z
  .object({
    business: businessInputSchema,
    services: z.array(onboardingServiceInputSchema).max(50),
    staff: z.array(staffInputSchema).max(30),
    hours: z.array(hoursInputSchema).max(7),
    // Sist: övriga fel (steg 1–3) visas före villkorsrutan (sista steget).
    [ONBOARDING_TERMS_FIELD]: acceptedTermsSchema,
  })
  .check((ctx) => {
    const { services, staff, hours } = ctx.value;
    for (const [i, s] of staff.entries()) {
      if (s.serviceIndexes.some((idx) => idx >= services.length)) {
        ctx.issues.push({
          code: "custom",
          message: "staff.service_index_out_of_range",
          input: i,
          path: ["staff", i, "serviceIndexes"],
        });
      }
    }
    const weekdays = new Set(hours.map((h) => h.weekday));
    if (weekdays.size !== hours.length) {
      ctx.issues.push({
        code: "custom",
        message: "hours.weekday_duplicate",
        input: hours,
        path: ["hours"],
      });
    }
  });

export type OnboardingInput = z.infer<typeof onboardingInputSchema>;
