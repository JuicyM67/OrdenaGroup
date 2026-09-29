import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { MEDIA_BUCKET } from "@/lib/validation/profile";

import type { MediaStorage } from "./profile";

/**
 * Storage-åtkomst för profilbilder (WP-41) med ÄGARENS session, inte service
 * role:
 * - Storage-API:t prövar `business-media owners insert`/`delete` (RLS på
 *   `storage.objects`) mot ägarens JWT, så en ägare kan aldrig signera eller
 *   ta bort något utanför sitt eget `<business_id>/`-prefix — även om
 *   serverkoden hade en bugg. Service role skulle förbigå den kontrollen.
 * - `SUPABASE_SERVICE_ROLE_KEY` läses bara i `src/server/db/pool.ts`
 *   (boundaries.test.ts), och behövs inte här.
 * - Den signerade uppladdnings-URL:en gäller en enda sökväg (vi väljer
 *   `<business_id>/<uuid>.<ext>`, ingen upsert), och bucketens
 *   `file_size_limit`/`allowed_mime_types` gäller även för den.
 */
export function mediaStorageFrom(client: SupabaseClient): MediaStorage {
  const bucket = () => client.storage.from(MEDIA_BUCKET);
  return {
    async createSignedUploadUrl(path) {
      const { data, error } = await bucket().createSignedUploadUrl(path);
      if (error || !data) return { ok: false };
      return { ok: true, signedUrl: data.signedUrl, token: data.token };
    },
    async remove(paths) {
      if (paths.length === 0) return true;
      const { error } = await bucket().remove([...paths]);
      return !error;
    },
  };
}

/** Standard i server actions: sessionsklienten från cookien (WP-15). */
export async function ownerMediaStorage(): Promise<MediaStorage> {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const client = await createSupabaseServerClient();
  return mediaStorageFrom(client as unknown as SupabaseClient);
}
