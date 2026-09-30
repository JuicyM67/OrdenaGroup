import "server-only";

/**
 * WP-46 steg 6 (ui-engineer) + uppföljning (db-engineer, commit 72f1ebc):
 * inloggad personal kan byta SIN EGEN profilbild och titel — samma
 * uppladdningsflöde som `src/server/owner/profile.ts` (`kind: "staff"`), men
 * bara för den egna personalraden (`member.staffId`), utan `can_manage_team`.
 * "Min profil" i kontomenyn (`UserMenu`), inte Ajustes → Equipo.
 *
 * RLS-läget (db-engineer, commit 72f1ebc): personal får INSERT i
 * `business-media` (egna företagets mapp) och UPDATE av `photo_url`/`title`
 * på sin EGEN personalrad (en trigger blockerar andra kolumner), men
 * SELECT/UPDATE/DELETE på `storage.objects` kräver fortfarande
 * `can_edit_settings`. Därför:
 * - `createOwnPhotoUpload` signerar uppladdningen med DEN INLOGGADES EGEN
 *   session (samma försvar-i-djupet-motiv som `ownerMediaStorage` — Storage-
 *   API:t prövar RLS mot JWT:t oavsett vad servern tror).
 * - `confirmOwnPhotoUpload`/`deleteOwnPhoto` kör i `withServiceTx` (samma
 *   mönster som `src/server/team/invitations.ts`) med en EGEN "är det här
 *   min egen personalrad"-kontroll i TypeScript i stället för RLS (annars
 *   skulle SELECT mot `storage.objects.metadata` och borttagningen av det
 *   gamla fotot nekas för personal utan `can_edit_settings`) — `staffId`
 *   läses först i en separat `withOwnerTx` (RLS/`loadMember`), sen används
 *   bara som ett redan verifierat värde i service-transaktionen.
 */
import { randomUUID } from "node:crypto";

import {
  IMAGE_CONTENT_TYPES,
  IMAGE_EXTENSION,
  IMAGE_MAX_BYTES,
  imageUploadInputSchema,
  staffTitleSchema,
} from "@/lib/validation/profile";
import { mediaPathFromUrl, publicMediaUrl } from "@/server/bookings/media";
import { pgErrorCode } from "@/server/db/errors";
import { loadMember } from "@/server/db/permissions";
import { getStorageAdminClient, type Queryable } from "@/server/db/pool";
import { withOwnerTx, withServiceTx } from "@/server/db/tx";
import {
  mediaStorageFrom,
  ownerMediaStorage,
} from "@/server/owner/media-storage";

export type MyProfileResult = { ok: true } | { ok: false; code: string };
export type MyPhotoUploadTicket =
  | { ok: true; path: string; signedUrl: string; token: string }
  | { ok: false; code: string };

const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

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
  if (code === "23514" && constraint === "staff_photo_url_format") {
    return "profile.image_url_invalid";
  }
  return "unknown";
}

/** `null` = personen har ingen egen personalrad (ägare utan kopplad
 * profesional, eller inte medlem alls) — "Min profil" har inget att göra. */
async function ownStaffId(
  q: Queryable,
  userId: string,
  businessId: string,
): Promise<string | null> {
  const member = await loadMember(q, userId, businessId);
  return member?.staffId ?? null;
}

export type MyProfile = {
  staffId: string;
  name: string;
  title: string;
  photoUrl: string | null;
};

export async function loadMyProfile(
  userId: string,
  businessId: string,
): Promise<MyProfile | null> {
  return withOwnerTx(userId, async (q) => {
    const staffId = await ownStaffId(q, userId, businessId);
    if (!staffId) return null;
    const r = await q.query<{
      name: string;
      title: string | null;
      photo_url: string | null;
    }>(
      `select name, title, photo_url from public.staff
        where id = $1 and business_id = $2`,
      [staffId, businessId],
    );
    const row = r.rows[0];
    if (!row) return null;
    return {
      staffId,
      name: row.name,
      title: row.title ?? "",
      photoUrl: row.photo_url,
    };
  });
}

export async function updateOwnTitle(
  userId: string,
  businessId: string,
  rawTitle: unknown,
): Promise<MyProfileResult> {
  const parsed = staffTitleSchema.safeParse(rawTitle);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "staff.title_too_long",
    };
  }
  try {
    return await withOwnerTx(userId, async (q) => {
      const staffId = await ownStaffId(q, userId, businessId);
      if (!staffId) return { ok: false, code: "unauthorized" };
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

export async function createOwnPhotoUpload(
  userId: string,
  businessId: string,
  rawContentType: unknown,
): Promise<MyPhotoUploadTicket> {
  const parsed =
    imageUploadInputSchema.shape.contentType.safeParse(rawContentType);
  if (!parsed.success) return { ok: false, code: "profile.image_type_invalid" };

  const staffId = await withOwnerTx(userId, (q) =>
    ownStaffId(q, userId, businessId),
  );
  if (!staffId) return { ok: false, code: "unauthorized" };

  const path = `${businessId}/${randomUUID()}.${IMAGE_EXTENSION[parsed.data]}`;
  const signed = await (await ownerMediaStorage()).createSignedUploadUrl(path);
  if (!signed.ok) return { ok: false, code: "profile.upload_failed" };
  return { ok: true, path, signedUrl: signed.signedUrl, token: signed.token };
}

/** Bara sökvägar som `createOwnPhotoUpload` kan ha skapat för det här företaget. */
function isOwnUploadPath(path: string, businessId: string): boolean {
  const re = new RegExp(`^${UUID_RE}/${UUID_RE}\\.(jpg|png|webp)$`);
  return re.test(path) && path.startsWith(`${businessId}/`);
}

export async function confirmOwnPhotoUpload(
  userId: string,
  businessId: string,
  rawPath: unknown,
): Promise<{ ok: true; url: string } | { ok: false; code: string }> {
  const path = typeof rawPath === "string" ? rawPath : "";
  if (!isOwnUploadPath(path, businessId)) {
    return { ok: false, code: "invalid_input" };
  }

  const staffId = await withOwnerTx(userId, (q) =>
    ownStaffId(q, userId, businessId),
  );
  if (!staffId) return { ok: false, code: "unauthorized" };

  const url = publicMediaUrl(path);
  let result:
    | { ok: true; url: string; replaced: string | null }
    | { ok: false; code: string; discard: boolean };
  try {
    result = await withServiceTx(async (q) => {
      // Samma kontroll som owner/profile.ts confirmImageUpload, men här (i
      // stället för via RLS) eftersom personal saknar SELECT på
      // storage.objects.
      const obj = await q.query<{ size: string | null; mime: string | null }>(
        `select metadata->>'size' as size, metadata->>'mimetype' as mime
           from storage.objects
          where bucket_id = 'business-media' and name = $1`,
        [path],
      );
      const o = obj.rows[0];
      if (!o) {
        return { ok: false, code: "profile.upload_missing", discard: false };
      }
      const size = Number(o.size);
      if (
        !(IMAGE_CONTENT_TYPES as readonly string[]).includes(o.mime ?? "") ||
        !Number.isFinite(size) ||
        size > IMAGE_MAX_BYTES
      ) {
        return { ok: false, code: "profile.image_type_invalid", discard: true };
      }
      const prev = await q.query<{ url: string | null }>(
        `select photo_url as url from public.staff
          where id = $1 and business_id = $2 for update`,
        [staffId, businessId],
      );
      if (!prev.rowCount) {
        return { ok: false, code: "unauthorized", discard: true };
      }
      await q.query(
        `update public.staff set photo_url = $1 where id = $2 and business_id = $3`,
        [url, staffId, businessId],
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

  const admin = mediaStorageFrom(getStorageAdminClient());
  if (!result.ok) {
    if (result.discard) await admin.remove([path]);
    return { ok: false, code: result.code };
  }
  if (result.replaced && result.replaced !== path) {
    await admin.remove([result.replaced]);
  }
  return { ok: true, url: result.url };
}

export async function deleteOwnPhoto(
  userId: string,
  businessId: string,
): Promise<MyProfileResult> {
  const staffId = await withOwnerTx(userId, (q) =>
    ownStaffId(q, userId, businessId),
  );
  if (!staffId) return { ok: false, code: "unauthorized" };

  let removed: string | null;
  try {
    removed = await withServiceTx(async (q) => {
      const prev = await q.query<{ url: string | null }>(
        `select photo_url as url from public.staff
          where id = $1 and business_id = $2 for update`,
        [staffId, businessId],
      );
      if (!prev.rowCount) return null;
      await q.query(
        `update public.staff set photo_url = null where id = $1 and business_id = $2`,
        [staffId, businessId],
      );
      return mediaPathFromUrl(prev.rows[0]!.url, businessId);
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
  if (removed) {
    await mediaStorageFrom(getStorageAdminClient()).remove([removed]);
  }
  return { ok: true };
}
