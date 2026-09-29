import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  dropTestBusiness,
  type TestBusiness,
} from "@/server/db/testing";

import { createImageUpload, type MediaStorage } from "./profile";

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
