import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  dropTestBusiness,
  type TestBusiness,
} from "@/server/db/testing";

import {
  confirmImageUpload,
  createImageUpload,
  type MediaStorage,
} from "./profile";

let biz: TestBusiness;
let other: TestBusiness;

/** Fångar signerade sökvägar i stället för att prata med Storage. */
function fakeStorage(): MediaStorage & { signed: string[] } {
  const signed: string[] = [];
  return {
    signed,
    async createSignedUploadUrl(path) {
      signed.push(path);
      return {
        ok: true,
        signedUrl: `https://storage.test/${path}`,
        token: "t",
      };
    },
    async remove() {
      return true;
    },
  };
}

const PNG = { contentType: "image/png", size: 500_000 };

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness();
  other = await createTestBusiness();
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await dropTestBusiness(other);
  await closePool();
});

describe("createImageUpload (WP-41)", () => {
  it("signerar <business_id>/<uuid>.<ext> för ägaren", async () => {
    const storage = fakeStorage();
    const r = await createImageUpload(
      biz.ownerUserId,
      biz.id,
      { kind: "cover", ...PNG },
      storage,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.path).toMatch(new RegExp(`^${biz.id}/[0-9a-f-]{36}\\.png$`));
    expect(storage.signed).toEqual([r.path]);
  });

  it("typ och storlek valideras innan något signeras", async () => {
    const storage = fakeStorage();
    expect(
      await createImageUpload(
        biz.ownerUserId,
        biz.id,
        { kind: "logo", contentType: "image/gif", size: 10 },
        storage,
      ),
    ).toEqual({ ok: false, code: "profile.image_type_invalid" });
    expect(
      await createImageUpload(
        biz.ownerUserId,
        biz.id,
        { kind: "logo", contentType: "image/jpeg", size: 2 * 1024 * 1024 + 1 },
        storage,
      ),
    ).toEqual({ ok: false, code: "profile.image_too_large" });
    expect(storage.signed).toEqual([]);
  });

  it("en annan ägare får inte signera i företagets mapp", async () => {
    const storage = fakeStorage();
    expect(
      await createImageUpload(
        other.ownerUserId,
        biz.id,
        { kind: "gallery", ...PNG },
        storage,
      ),
    ).toEqual({ ok: false, code: "unauthorized" });
    expect(storage.signed).toEqual([]);
  });

  it("galleriet tar högst 12 bilder", async () => {
    await adminQuery(
      `insert into public.business_images (business_id, path, sort)
       select $1::uuid, $1::text || '/' || gen_random_uuid() || '.jpg', g
         from generate_series(1, 11) g`,
      [biz.id],
    );
    const storage = fakeStorage();
    const eleventh = await createImageUpload(
      biz.ownerUserId,
      biz.id,
      { kind: "gallery", ...PNG },
      storage,
    );
    expect(eleventh.ok).toBe(true);

    await adminQuery(
      `insert into public.business_images (business_id, path, sort)
       values ($1::uuid, $1::text || '/extra.jpg', 12)`,
      [biz.id],
    );
    expect(
      await createImageUpload(
        biz.ownerUserId,
        biz.id,
        { kind: "gallery", ...PNG },
        storage,
      ),
    ).toEqual({ ok: false, code: "profile.gallery_full" });
    // Omslag och logga räknas inte mot galleriet.
    expect(
      (
        await createImageUpload(
          biz.ownerUserId,
          biz.id,
          { kind: "logo", ...PNG },
          storage,
        )
      ).ok,
    ).toBe(true);
  });
});

describe("confirmImageUpload · staff (WP-44 säkerhetsgranskning)", () => {
  it("ett annat företags staffId ger invalid_input, deras foto ändras inte", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
    try {
      const otherPhotoUrl =
        "https://proj.supabase.co/storage/v1/object/public/business-media/" +
        `${other.id}/00000000-0000-4000-8000-000000000000.jpg`;
      await adminQuery(`update public.staff set photo_url = $1 where id = $2`, [
        otherPhotoUrl,
        other.staff.diego,
      ]);

      // `biz`s ägare har laddat upp riktigt i sin egen mapp, men försöker
      // koppla filen till `other`s personal (D-014: business_id måste med i
      // varje fråga, inte bara `staffId`).
      const path = `${biz.id}/11111111-1111-4111-8111-111111111111.png`;
      await adminQuery(
        `insert into storage.objects (bucket_id, name, metadata)
         values ('business-media', $1, jsonb_build_object('size', 500000, 'mimetype', 'image/png'))`,
        [path],
      );

      const result = await confirmImageUpload(
        biz.ownerUserId,
        biz.id,
        { kind: "staff", path, staffId: other.staff.diego },
        fakeStorage(),
      );
      expect(result).toEqual({ ok: false, code: "invalid_input" });

      const row = await adminQuery<{ photo_url: string }>(
        `select photo_url from public.staff where id = $1`,
        [other.staff.diego],
      );
      expect(row.rows[0]!.photo_url).toBe(otherPhotoUrl);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
