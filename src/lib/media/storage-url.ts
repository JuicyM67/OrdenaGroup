/**
 * Publika Storage-URL:er för projektets EGEN Supabase-värd (WP-70, säkerhets-
 * granskning #111 S2/S3). Ingen `server-only`: `NEXT_PUBLIC_SUPABASE_URL` bakas in
 * i klientbygget, så samma regel gäller på servern och i `OfferImage`.
 *
 * `offers.image_url` lagrar bara en relativ referens — `offer-images/<business_id>/
 * <uuid>.<ext>` — eller en statisk fil i `public/` (`/demo/...`). Full URL byggs här,
 * så ingen värd lagras i databasen och lokalt (127.0.0.1:54321) fungerar som molnet.
 */

const STATIC_FILE = /^\/(?!\/)[A-Za-z0-9/_.-]+$/;
const OFFER_REF =
  /^offer-images\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;
const PUBLIC_BUCKETS = ["offer-images", "business-media"] as const;

/** `https://<ref>.supabase.co/storage/v1/object/public/` (lokalt http://127.0.0.1:54321/…),
 * eller `null` om miljövariabeln saknas. */
export function storagePublicBase(
  supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  if (!supabaseUrl) return null;
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/`;
}

/** Relativ bildreferens för ett erbjudande: `<business_id>/<uuid>.<ext>` → `offer-images/…`. */
export function offerImageRef(path: string): string {
  return `offer-images/${path}`;
}

export function isOfferImageRef(ref: string): boolean {
  return OFFER_REF.test(ref);
}

/** Lagrad referens → URL att visa. Okända former (t.ex. en extern värd) → `null`. */
export function offerImageSrc(
  ref: string | null,
  base: string | null = storagePublicBase(),
): string | null {
  if (!ref) return null;
  if (STATIC_FILE.test(ref)) return ref;
  if (base && OFFER_REF.test(ref)) return base + ref;
  return null;
}

/** En statisk fil i `public/` eller en publik fil i projektets EGEN Storage. */
export function isOwnImageUrl(
  url: string,
  base: string | null = storagePublicBase(),
): boolean {
  if (STATIC_FILE.test(url)) return true;
  if (!base || !url.startsWith(base)) return false;
  const rest = url.slice(base.length);
  return (
    PUBLIC_BUCKETS.some((b) => rest.startsWith(`${b}/`)) &&
    /^[A-Za-z0-9/_.%-]+$/.test(rest) &&
    !rest.includes("..")
  );
}
