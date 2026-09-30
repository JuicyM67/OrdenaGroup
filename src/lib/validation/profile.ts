/**
 * Företagsprofilen (WP-41, F1/F5): gränser och Zod-scheman för ägarens
 * profiltexter och bilduppladdningar. Ingen `server-only` — UI:t får läsa
 * gränserna (typ, storlek, antal) för att förvalidera i webbläsaren, men
 * servern validerar alltid själv (hård regel 2). Felkoder, ingen spansk text
 * (hård regel 6: UI mappar koderna).
 *
 * Gränserna speglar databasen (20260929130000_business_profile_media.sql):
 * bucket `business-media` (2 MiB, jpeg/png/webp), `businesses_about_length`
 * (1500), `services_description_length` (500), `staff_title_length` (100),
 * `businesses_instagram_format`.
 */
import { z } from "zod";

import { phoneInputSchema } from "@/lib/format/schemas";

export const MEDIA_BUCKET = "business-media";

/** 2 MiB, samma som bucketens `file_size_limit`. */
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export const IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];

export const IMAGE_EXTENSION: Readonly<Record<ImageContentType, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Galleriet (business_images), omslag och logga räknas inte. */
export const GALLERY_MAX = 12;

/** WP-44: `"staff"` = personalens profilbild (`staff.photo_url`, samma
 * bucket/gränser, kräver `staffId`). */
export const IMAGE_KINDS = ["cover", "logo", "gallery", "staff"] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];

export const ABOUT_MAX = 1500;
export const SERVICE_DESCRIPTION_MAX = 500;
export const STAFF_TITLE_MAX = 100;

export const imageUploadInputSchema = z.object({
  kind: z.enum(IMAGE_KINDS, { error: "profile.image_kind_invalid" }),
  contentType: z.enum(IMAGE_CONTENT_TYPES, {
    error: "profile.image_type_invalid",
  }),
  size: z
    .number({ error: "profile.image_size_invalid" })
    .int({ error: "profile.image_size_invalid" })
    .min(1, { error: "profile.image_size_invalid" })
    .max(IMAGE_MAX_BYTES, { error: "profile.image_too_large" }),
  /** WP-44: bara `kind: "staff"` — vilken personal fotot gäller. Formatet
   * (giltig UUID) kontrolleras i `profile.ts`, inte här (samma mönster som
   * `path` i `confirmImageUpload`). */
  staffId: z.string().optional(),
});
export type ImageUploadInput = z.infer<typeof imageUploadInputSchema>;

/** Tom sträng/bara blanksteg → null (fältet rensas). */
function optionalText(max: number, tooLong: string) {
  return z
    .string({ error: "profile.text_invalid_type" })
    .trim()
    .max(max, { error: tooLong })
    .transform((s) => (s.length === 0 ? null : s));
}

/**
 * Instagram: ägaren klistrar ofta in "@handle" eller hela länken. Sparas som
 * bara handtaget (DB-regeln: 1–30 tecken, bokstäver/siffror/punkt/understreck).
 */
export const instagramInputSchema = z
  .string({ error: "profile.instagram_invalid" })
  .trim()
  .transform((s) =>
    s
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .replace(/^@/, "")
      .replace(/[/?#].*$/, ""),
  )
  .check((ctx) => {
    if (ctx.value !== "" && !/^[A-Za-z0-9._]{1,30}$/.test(ctx.value)) {
      ctx.issues.push({
        code: "custom",
        message: "profile.instagram_invalid",
        input: ctx.value,
      });
    }
  })
  .transform((s) => (s.length === 0 ? null : s));

export const businessProfileInputSchema = z.object({
  about: optionalText(ABOUT_MAX, "profile.about_too_long"),
  instagram: instagramInputSchema,
  address: optionalText(200, "business.address_too_long"),
  /** Tom = inget telefonnummer på profilen. */
  phone: z
    .literal("")
    .transform(() => null)
    .or(phoneInputSchema),
});
export type BusinessProfileInput = z.infer<typeof businessProfileInputSchema>;

export const serviceDescriptionSchema = optionalText(
  SERVICE_DESCRIPTION_MAX,
  "services.description_too_long",
);

export const staffTitleSchema = optionalText(
  STAFF_TITLE_MAX,
  "staff.title_too_long",
);

const UUID = z.uuid({ error: "invalid_input" });

export const reorderImagesInputSchema = z
  .array(UUID)
  .max(GALLERY_MAX, { error: "profile.gallery_full" })
  .check((ctx) => {
    if (new Set(ctx.value).size !== ctx.value.length) {
      ctx.issues.push({
        code: "custom",
        message: "invalid_input",
        input: ctx.value,
      });
    }
  });
