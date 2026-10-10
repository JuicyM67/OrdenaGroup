import "server-only";

import { MEDIA_BUCKET } from "@/lib/validation/profile";

/**
 * Publika URL:er för bucketen `business-media` (WP-41). Bucketen är publik
 * (se 20260929130000_business_profile_media.sql), så `/object/public/…`
 * serveras direkt av Storage utan RLS och utan signering — den publika
 * profilen behöver alltså ingen Storage-klient, bara bas-URL:en.
 */

function supabaseBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL saknas (se .env.example)");
  }
  return url.replace(/\/+$/, "");
}

function publicPrefix(baseUrl: string): string {
  return `${baseUrl}/storage/v1/object/public/${MEDIA_BUCKET}/`;
}

/** `<business_id>/<uuid>.<ext>` → publik URL. */
export function publicMediaUrl(
  path: string,
  baseUrl: string = supabaseBaseUrl(),
): string {
  return (
    publicPrefix(baseUrl) + path.split("/").map(encodeURIComponent).join("/")
  );
}

/**
 * Omvändningen, för att kunna ta bort det gamla objektet när omslag/logga
 * ersätts. `null` om URL:en inte pekar på det här företagets mapp i vår
 * bucket (t.ex. en äldre extern `logo_url`) — då rörs ingenting i Storage.
 */
export function mediaPathFromUrl(
  url: string | null,
  businessId: string,
  baseUrl: string = supabaseBaseUrl(),
): string | null {
  if (!url) return null;
  const prefix = publicPrefix(baseUrl);
  if (!url.startsWith(prefix)) return null;
  let path: string;
  try {
    path = url
      .slice(prefix.length)
      .split("/")
      .map(decodeURIComponent)
      .join("/");
  } catch {
    return null;
  }
  return path.startsWith(`${businessId}/`) && !path.includes("..")
    ? path
    : null;
}

/**
 * WP-63 (D-043): demoföretagens bilder är våra egna statiska filer i
 * `public/demo/<cl|se>/`, inte objekt i bucketen. Samma vitlista som
 * CHECK-reglerna i 20261010120000_demo_businesses.sql — bara en relativ
 * sökväg till de filerna, aldrig en extern domän.
 */
const DEMO_ASSET_RE = /^\/demo\/(cl|se)\/[a-z0-9-]+\.(webp|jpg|png|svg)$/;

export function isDemoAssetUrl(url: string): boolean {
  return DEMO_ASSET_RE.test(url);
}

/** Bild-URL som får visas publikt: vår bucket i företagets egen mapp, eller
 * en statisk demobild. Annars `null`. */
export function publicImageUrl(
  url: string | null,
  businessId: string,
): string | null {
  if (!url) return null;
  if (isDemoAssetUrl(url)) return url;
  return mediaPathFromUrl(url, businessId) ? url : null;
}
