/**
 * Erbjudanderedigeraren (WP-70, D-056): gränser och Zod-schema. Ingen
 * `server-only` — UI:t läser gränserna, servern validerar alltid själv
 * (hård regel 2). Felkoder, ingen text (UI mappar koderna).
 *
 * Gränserna speglar `public.offers` (20261014010000_marketplace.sql) och
 * bucketen `offer-images` (20261015010000_offers_editor.sql).
 */
import { z } from "zod";

import type { MarketplaceCategoryId } from "@/config/marketplace";
import { parseLocalDate } from "@/lib/format/dates";

export const OFFER_IMAGE_BUCKET = "offer-images";
/** 5 MiB, samma som bucketens `file_size_limit`. */
export const OFFER_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const OFFER_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type OfferImageContentType = (typeof OFFER_IMAGE_CONTENT_TYPES)[number];
export const OFFER_IMAGE_EXTENSION: Readonly<
  Record<OfferImageContentType, string>
> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export const OFFER_TITLE_MAX = 80;
export const OFFER_TEXT_MAX = 1000;
export const OFFER_INCLUDES_MAX = 6;
export const OFFER_INCLUDE_ITEM_MAX = 80;
export const OFFER_VALID_MONTHS = [12, 18, 24, 36] as const;
export const OFFER_QUANTITY_MAX = 10000;

/** Samma lista som CHECK på `offers.category`. */
export const OFFER_CATEGORY_IDS = [
  "har",
  "naglar",
  "massage",
  "hudvard",
  "fransar",
  "ovrigt",
] as const satisfies readonly MarketplaceCategoryId[];

const localDate = z
  .string()
  .refine((v) => parseLocalDate(v).ok, { error: "offers.date_invalid" })
  .nullable();

export const offerInputSchema = z
  .object({
    serviceId: z.guid({ error: "offers.service_required" }),
    title: z
      .string({ error: "offers.title_empty" })
      .trim()
      .min(1, { error: "offers.title_empty" })
      .max(OFFER_TITLE_MAX, { error: "offers.title_too_long" }),
    description: z
      .string()
      .trim()
      .max(OFFER_TEXT_MAX, { error: "offers.text_too_long" }),
    includes: z
      .array(
        z
          .string()
          .trim()
          .max(OFFER_INCLUDE_ITEM_MAX, { error: "offers.include_too_long" }),
      )
      .transform((items) => items.filter((x) => x.length > 0))
      .pipe(
        z
          .array(z.string())
          .max(OFFER_INCLUDES_MAX, { error: "offers.includes_too_many" }),
      ),
    terms: z
      .string()
      .trim()
      .max(OFFER_TEXT_MAX, { error: "offers.text_too_long" }),
    category: z.enum(OFFER_CATEGORY_IDS, { error: "offers.category_invalid" }),
    /** Som användaren skrev det ("890", "1 290"); tolkas med `parseMoney` på servern. */
    offerPrice: z.string({ error: "offers.price_invalid" }),
    quantityTotal: z
      .number()
      .int({ error: "offers.quantity_invalid" })
      .min(1, { error: "offers.quantity_invalid" })
      .max(OFFER_QUANTITY_MAX, { error: "offers.quantity_invalid" })
      .nullable(),
    /** Första och sista säljdagen (lokala datum, båda inklusive). */
    saleStartsOn: localDate,
    saleEndsOn: localDate,
    validMonths: z
      .number()
      .int()
      .refine((n) => (OFFER_VALID_MONTHS as readonly number[]).includes(n), {
        error: "offers.valid_months_invalid",
      }),
    /** `undefined` = oförändrad, `null` = ta bort, sträng = ny uppladdning. */
    imagePath: z.string().nullable().optional(),
  })
  .refine(
    (v) =>
      v.saleStartsOn === null ||
      v.saleEndsOn === null ||
      v.saleEndsOn >= v.saleStartsOn,
    { error: "offers.sale_window_invalid", path: ["saleEndsOn"] },
  );

export type OfferInput = z.input<typeof offerInputSchema>;

export const offerImageUploadSchema = z.object({
  contentType: z.enum(OFFER_IMAGE_CONTENT_TYPES, {
    error: "offers.image_type_invalid",
  }),
  size: z
    .number({ error: "offers.image_type_invalid" })
    .int({ error: "offers.image_type_invalid" })
    .min(1, { error: "offers.image_type_invalid" })
    .max(OFFER_IMAGE_MAX_BYTES, { error: "offers.image_too_large" }),
});

/** Rabatt i hela procent, avrundad nedåt (samma regel som marknadsplatsen). */
export function offerDiscountPct(regular: number, price: number): number {
  if (regular <= 0 || price <= 0 || price >= regular) return 0;
  return Math.floor(((regular - price) * 100) / regular);
}
