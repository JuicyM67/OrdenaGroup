import "server-only";

/**
 * Företagsprofilen (WP-41, F1/F5): ägarens texter och bilder för `/{slug}`.
 *
 * Databasen går via `withOwnerTx` (D-019): RLS (`private.is_member`, owner/
 * admin) är gränsen, `businessId` skickas ändå explicit (D-014). Storage går
 * via ägarens session (`media-storage.ts`, motivering där) och injiceras som
 * `MediaStorage`, så att testerna kan byta ut den.
 *
 * Uppladdningsflöde:
 * 1. `createImageUpload` validerar typ/storlek/antal och signerar en
 *    uppladdnings-URL för `<business_id>/<uuid>.<ext>` (servern väljer namnet).
 * 2. Klienten laddar upp filen direkt till Storage (`uploadToSignedUrl`).
 * 3. `confirmImageUpload` kontrollerar att objektet finns (och dess typ och
 *    storlek i `storage.objects.metadata`) och sparar `cover_url`/`logo_url`
 *    eller en `business_images`-rad. En ersatt bild tas bort ur Storage.
 *
 * Storage-borttagning sker EFTER commit (en misslyckad borttagning lämnar i
 * värsta fall en föräldralös fil, aldrig en rad som pekar på en saknad fil).
 */
import { randomUUID } from "node:crypto";

import {
  businessProfileInputSchema,
  GALLERY_MAX,
  IMAGE_CONTENT_TYPES,
  IMAGE_EXTENSION,
  IMAGE_MAX_BYTES,
  imageUploadInputSchema,
  reorderImagesInputSchema,
  staffTitleSchema,
  type ImageKind,
} from "@/lib/validation/profile";
import { pgErrorCode } from "@/server/db/errors";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx } from "@/server/db/tx";
import { mediaPathFromUrl, publicMediaUrl } from "@/server/bookings/media";

export interface MediaStorage {
  createSignedUploadUrl(
    path: string,
  ): Promise<{ ok: true; signedUrl: string; token: string } | { ok: false }>;
  /** `true` om borttagningen lyckades (eller inget fanns att ta bort). */
  remove(paths: readonly string[]): Promise<boolean>;
}

export type ProfileResult = { ok: true } | { ok: false; code: string };

export type ImageUploadTicket = {
  ok: true;
  /** Skickas tillbaka oförändrad till `confirmImageUpload`. */
  path: string;
  signedUrl: string;
  token: string;
};

export type ProfileSettings = {
  about: string;
  instagram: string;
  address: string;
  phone: string;
  coverUrl: string | null;
  logoUrl: string | null;
  gallery: { id: string; url: string }[];
  /** WP-44: personalens foton, `staffId` → publik URL (bara de som har ett). */
  staffPhotos: Record<string, string>;
};

async function defaultStorage(): Promise<MediaStorage> {
  const { ownerMediaStorage } = await import("./media-storage");
  return ownerMediaStorage();
}

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "invalid_input";
}

function pgConstraint(e: unknown): string | undefined {
  if (typeof e !== "object" || e === null || !("constraint" in e)) {
    return undefined;
  }
  const v = (e as Record<string, unknown>).constraint;
  return typeof v === "string" ? v : undefined;
}

/** Bara SQLSTATE/constraint, aldrig detail (ingen persondata i fel/loggar). */
function mapDbError(e: unknown): string {
  const code = pgErrorCode(e);
  const constraint = pgConstraint(e);
  if (code === "42501") return "unauthorized";
  if (code === "23514" && constraint === "businesses_instagram_format") {
    return "profile.instagram_invalid";
  }
  if (
    code === "23514" &&
    (constraint === "businesses_cover_url_format" ||
      constraint === "businesses_logo_url_format" ||
      // WP-44: samma regel för staff.photo_url.
      constraint === "staff_photo_url_format")
  ) {
    return "profile.image_url_invalid";
  }
  return "unknown";
}

/** Ägare/admin i just det här företaget (samma villkor som RLS-policyerna). */
async function isOwner(q: Queryable, businessId: string): Promise<boolean> {
  const r = await q.query<{ ok: boolean }>(
    `select private.is_member($1, array['owner', 'admin']::public.member_role[]) as ok`,
    [businessId],
  );
  return r.rows[0]?.ok === true;
}

async function galleryCount(q: Queryable, businessId: string): Promise<number> {
  const r = await q.query<{ n: number }>(
    `select count(*)::int as n from public.business_images where business_id = $1`,
    [businessId],
  );
  return r.rows[0]?.n ?? 0;
}

// ---------------------------------------------------------------------------
// Läsning (inställningssidan)
// ---------------------------------------------------------------------------

export function loadProfileSettings(
  userId: string,
  businessId: string,
): Promise<ProfileSettings> {
  return withOwnerTx(userId, async (q) => {
    const b = await q.query<{
      about: string | null;
      instagram: string | null;
      address: string | null;
      phone: string | null;
      cover_url: string | null;
      logo_url: string | null;
    }>(
      `select about, instagram, address, phone, cover_url, logo_url
         from public.businesses where id = $1`,
      [businessId],
    );
    const row = b.rows[0];
    if (!row) throw new Error("loadProfileSettings: företaget hittades inte");
    const imgs = await q.query<{ id: string; path: string }>(
      `select id, path from public.business_images
        where business_id = $1
        order by sort, created_at`,
      [businessId],
    );
    const staffPhotoRows = await q.query<{ id: string; photo_url: string }>(
      `select id, photo_url from public.staff
        where business_id = $1 and photo_url is not null`,
      [businessId],
    );
    // Säkerhetsgranskning WP-44: samma filter som den publika sidan
    // (`page-data.ts`) — bara bilder i vår bucket och företagets egen mapp
    // visas, aldrig en extern URL (försvar på djupet, kolumnen kan i teorin
    // bara innehålla sådana via vårt eget skrivflöde, men vi litar inte
    // blint på det här heller).
    const staffPhotos = Object.fromEntries(
      staffPhotoRows.rows
        .filter((s) => mediaPathFromUrl(s.photo_url, businessId) !== null)
        .map((s) => [s.id, s.photo_url]),
    );
    return {
      about: row.about ?? "",
      instagram: row.instagram ?? "",
      address: row.address ?? "",
      phone: row.phone ?? "",
      coverUrl: row.cover_url,
      logoUrl: row.logo_url,
      gallery: imgs.rows.map((i) => ({
        id: i.id,
        url: publicMediaUrl(i.path),
      })),
      staffPhotos,
    };
  });
}

// ---------------------------------------------------------------------------
// Texter
// ---------------------------------------------------------------------------

export async function updateBusinessProfile(
  userId: string,
  businessId: string,
  rawInput: unknown,
): Promise<ProfileResult> {
  const parsed = businessProfileInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: firstIssue(parsed.error) };
  const input = parsed.data;
  try {
    return await withOwnerTx(userId, async (q) => {
      const r = await q.query(
        `update public.businesses
            set about = $1, instagram = $2, address = $3, phone = $4
          where id = $5`,
        [input.about, input.instagram, input.address, input.phone, businessId],
      );
      return r.rowCount ? { ok: true } : { ok: false, code: "unauthorized" };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}

export async function updateStaffTitle(
  userId: string,
  businessId: string,
  staffId: string,
  rawTitle: unknown,
): Promise<ProfileResult> {
  const parsed = staffTitleSchema.safeParse(rawTitle);
  if (!parsed.success) return { ok: false, code: firstIssue(parsed.error) };
  try {
    return await withOwnerTx(userId, async (q) => {
      const r = await q.query(
        `update public.staff set title = $1 where id = $2 and business_id = $3`,
        [parsed.data, staffId, businessId],
      );
      return r.rowCount ? { ok: true } : { ok: false, code: "unauthorized" };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}

// ---------------------------------------------------------------------------
// Bilder
// ---------------------------------------------------------------------------

const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const UUID_ONLY_RE = new RegExp(`^${UUID_RE}$`);

/** WP-44: `staffId` kommer in som `unknown` (klientinput), samma slappa
 * kontroll som `imageUploadInputSchema.staffId` lämnar kvar till servern. */
function isValidUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_ONLY_RE.test(v);
}

export async function createImageUpload(
  userId: string,
  businessId: string,
  rawInput: unknown,
  storage?: MediaStorage,
): Promise<ImageUploadTicket | { ok: false; code: string }> {
  const parsed = imageUploadInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: firstIssue(parsed.error) };
  const { kind, contentType, staffId } = parsed.data;
  if (kind === "staff" && !isValidUuid(staffId)) {
    return { ok: false, code: "invalid_input" };
  }

  const check = await withOwnerTx(userId, async (q) => {
    if (!(await isOwner(q, businessId))) return "unauthorized";
    if (
      kind === "gallery" &&
      (await galleryCount(q, businessId)) >= GALLERY_MAX
    ) {
      return "profile.gallery_full";
    }
    if (kind === "staff") {
      // Personen måste tillhöra det här företaget (annars kunde en ägare
      // signera en uppladdning "åt" en annan ägares anställd).
      const belongs = await q.query(
        `select 1 from public.staff where id = $1 and business_id = $2`,
        [staffId, businessId],
      );
      if (!belongs.rowCount) return "invalid_input";
    }
    return null;
  });
  if (check) return { ok: false, code: check };

  const path = `${businessId}/${randomUUID()}.${IMAGE_EXTENSION[contentType]}`;
  const signed = await (
    storage ?? (await defaultStorage())
  ).createSignedUploadUrl(path);
  if (!signed.ok) return { ok: false, code: "profile.upload_failed" };
  return { ok: true, path, signedUrl: signed.signedUrl, token: signed.token };
}

/** Bara sökvägar som `createImageUpload` kan ha skapat för det här företaget. */
function isOwnUploadPath(path: string, businessId: string): boolean {
  const re = new RegExp(`^${UUID_RE}/${UUID_RE}\\.(jpg|png|webp)$`);
  return re.test(path) && path.startsWith(`${businessId}/`);
}

export async function confirmImageUpload(
  userId: string,
  businessId: string,
  rawInput: unknown,
  storage?: MediaStorage,
): Promise<
  { ok: true; url: string; imageId?: string } | { ok: false; code: string }
> {
  const input = rawInput as {
    kind?: unknown;
    path?: unknown;
    staffId?: unknown;
  } | null;
  const kindParsed = imageUploadInputSchema.shape.kind.safeParse(input?.kind);
  if (!kindParsed.success)
    return { ok: false, code: "profile.image_kind_invalid" };
  const kind: ImageKind = kindParsed.data;
  const path = typeof input?.path === "string" ? input.path : "";
  if (!isOwnUploadPath(path, businessId)) {
    return { ok: false, code: "invalid_input" };
  }
  if (kind === "staff" && !isValidUuid(input?.staffId)) {
    return { ok: false, code: "invalid_input" };
  }
  const staffId = kind === "staff" ? (input!.staffId as string) : undefined;
  const url = publicMediaUrl(path);

  let result:
    | { ok: true; url: string; imageId?: string; replaced: string | null }
    | { ok: false; code: string; discard: boolean };
  try {
    result = await withOwnerTx(userId, async (q) => {
      // Objektet måste finnas (klienten har laddat upp) och hålla gränserna
      // — bucketen tvingar dem redan, det här är försvar på djupet.
      const obj = await q.query<{ size: string | null; mime: string | null }>(
        `select metadata->>'size' as size, metadata->>'mimetype' as mime
           from storage.objects
          where bucket_id = 'business-media' and name = $1`,
        [path],
      );
      const o = obj.rows[0];
      if (!o)
        return { ok: false, code: "profile.upload_missing", discard: false };
      const size = Number(o.size);
      if (
        !(IMAGE_CONTENT_TYPES as readonly string[]).includes(o.mime ?? "") ||
        !Number.isFinite(size) ||
        size > IMAGE_MAX_BYTES
      ) {
        return { ok: false, code: "profile.image_type_invalid", discard: true };
      }

      if (kind === "gallery") {
        // Radlås på företaget: två samtidiga bekräftelser kan inte båda
        // passera antalsgränsen.
        const lock = await q.query(
          `select id from public.businesses where id = $1 for update`,
          [businessId],
        );
        if (!lock.rowCount)
          return { ok: false, code: "unauthorized", discard: true };
        if ((await galleryCount(q, businessId)) >= GALLERY_MAX) {
          return { ok: false, code: "profile.gallery_full", discard: true };
        }
        const ins = await q.query<{ id: string }>(
          `insert into public.business_images (business_id, path, sort)
           select $1, $2, coalesce(max(sort), 0) + 1
             from public.business_images where business_id = $1
           returning id`,
          [businessId, path],
        );
        return { ok: true, url, imageId: ins.rows[0]!.id, replaced: null };
      }

      if (kind === "staff") {
        const prev = await q.query<{ url: string | null }>(
          `select photo_url as url from public.staff
            where id = $1 and business_id = $2 for update`,
          [staffId, businessId],
        );
        if (!prev.rowCount)
          return { ok: false, code: "invalid_input", discard: true };
        await q.query(
          `update public.staff set photo_url = $1 where id = $2 and business_id = $3`,
          [url, staffId, businessId],
        );
        return {
          ok: true,
          url,
          replaced: mediaPathFromUrl(prev.rows[0]!.url, businessId),
        };
      }

      const column = kind === "cover" ? "cover_url" : "logo_url";
      const prev = await q.query<{ url: string | null }>(
        `select ${column} as url from public.businesses where id = $1 for update`,
        [businessId],
      );
      if (!prev.rowCount)
        return { ok: false, code: "unauthorized", discard: true };
      await q.query(
        `update public.businesses set ${column} = $1 where id = $2`,
        [url, businessId],
      );
      return {
        ok: true,
        url,
        replaced: mediaPathFromUrl(prev.rows[0]!.url, businessId),
      };
    });
  } catch (e) {
    result = { ok: false, code: mapDbError(e), discard: true };
  }

  const s = storage ?? (await defaultStorage());
  if (!result.ok) {
    if (result.discard) await s.remove([path]);
    return { ok: false, code: result.code };
  }
  if (result.replaced && result.replaced !== path)
    await s.remove([result.replaced]);
  return result.imageId
    ? { ok: true, url: result.url, imageId: result.imageId }
    : { ok: true, url: result.url };
}

export type DeleteImageTarget =
  | { kind: "gallery"; id: string }
  | { kind: "cover" }
  | { kind: "logo" }
  /** WP-44: personalens foto. */
  | { kind: "staff"; staffId: string };

export async function deleteImage(
  userId: string,
  businessId: string,
  target: DeleteImageTarget,
  storage?: MediaStorage,
): Promise<ProfileResult> {
  if (target.kind === "staff" && !isValidUuid(target.staffId)) {
    return { ok: false, code: "invalid_input" };
  }
  let removed: string | null;
  try {
    const r = await withOwnerTx(userId, async (q) => {
      if (target.kind === "gallery") {
        const del = await q.query<{ path: string }>(
          `delete from public.business_images
            where id = $1 and business_id = $2 returning path`,
          [target.id, businessId],
        );
        const row = del.rows[0];
        return row ? { ok: true as const, path: row.path } : null;
      }
      if (target.kind === "staff") {
        const prev = await q.query<{ url: string | null }>(
          `select photo_url as url from public.staff
            where id = $1 and business_id = $2 for update`,
          [target.staffId, businessId],
        );
        if (!prev.rowCount) return null;
        await q.query(
          `update public.staff set photo_url = null where id = $1 and business_id = $2`,
          [target.staffId, businessId],
        );
        return {
          ok: true as const,
          path: mediaPathFromUrl(prev.rows[0]!.url, businessId),
        };
      }
      const column = target.kind === "cover" ? "cover_url" : "logo_url";
      const prev = await q.query<{ url: string | null }>(
        `select ${column} as url from public.businesses where id = $1 for update`,
        [businessId],
      );
      if (!prev.rowCount) return null;
      await q.query(
        `update public.businesses set ${column} = null where id = $1`,
        [businessId],
      );
      return {
        ok: true as const,
        path: mediaPathFromUrl(prev.rows[0]!.url, businessId),
      };
    });
    if (!r) return { ok: false, code: "unauthorized" };
    removed = r.path;
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
  if (removed) await (storage ?? (await defaultStorage())).remove([removed]);
  return { ok: true };
}

/** `ids` = hela galleriet i ny ordning (exakt samma mängd som finns). */
export async function reorderImages(
  userId: string,
  businessId: string,
  rawIds: unknown,
): Promise<ProfileResult> {
  const parsed = reorderImagesInputSchema.safeParse(rawIds);
  if (!parsed.success) return { ok: false, code: firstIssue(parsed.error) };
  const ids = parsed.data;
  try {
    return await withOwnerTx(userId, async (q) => {
      const cur = await q.query<{ id: string }>(
        `select id from public.business_images where business_id = $1`,
        [businessId],
      );
      const existing = new Set(cur.rows.map((r) => r.id));
      if (
        existing.size !== ids.length ||
        !ids.every((id) => existing.has(id))
      ) {
        return { ok: false, code: "invalid_input" };
      }
      for (const [i, id] of ids.entries()) {
        await q.query(
          `update public.business_images set sort = $1 where id = $2 and business_id = $3`,
          [i + 1, id, businessId],
        );
      }
      return { ok: true };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}
