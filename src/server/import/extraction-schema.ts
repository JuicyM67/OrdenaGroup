import "server-only";

/**
 * WP-66 (D-046): formen Claude MÅSTE svara i (structured outputs,
 * `output_config.format`). Medvetet släpp — inga min/max/regex: värdena
 * saneras och valideras sedan av `preview.ts` och, vid import, av samma
 * Zod-scheman som onboarding/Ajustes. Inga kunduppgifter, recensioner eller
 * persondata utöver personalens namn + titel som företaget självt publicerat.
 */
import { z } from "zod";

import { RUBRO_KEYS } from "@/server/onboarding/schemas";

const nullableText = z.string().nullable();

export const extractionSchema = z.strictObject({
  business: z.strictObject({
    name: nullableText,
    about: nullableText,
    address: nullableText,
    city: nullableText,
    /** Comuna. */
    district: nullableText,
    phone: nullableText,
    email: nullableText,
    website: nullableText,
    instagram: nullableText,
    tiktok: nullableText,
    facebook: nullableText,
    category: z.enum(RUBRO_KEYS).nullable(),
  }),
  /** 1 = måndag … 7 = söndag (ISO). Ett intervall per dag (första öppning → sista stängning). */
  hours: z.array(
    z.strictObject({
      weekday: z.number().int(),
      open: z.boolean(),
      start: nullableText,
      end: nullableText,
    }),
  ),
  categories: z.array(z.string()),
  services: z.array(
    z.strictObject({
      name: z.string(),
      description: nullableText,
      durationMin: z.number().int().nullable(),
      /** Heltal i marknadens huvudvaluta (pesos / kronor), inte öre. */
      price: z.number().int().nullable(),
      priceFrom: z.boolean(),
      category: nullableText,
    }),
  ),
  staff: z.array(
    z.strictObject({
      name: z.string(),
      title: nullableText,
    }),
  ),
  images: z.strictObject({
    logoUrl: nullableText,
    coverUrl: nullableText,
  }),
  confidence: z.enum(["high", "medium", "low"]),
  /** Korta anteckningar om vad som saknades eller var osäkert (på marknadens språk). */
  notes: z.array(z.string()),
});

export type Extraction = z.infer<typeof extractionSchema>;
