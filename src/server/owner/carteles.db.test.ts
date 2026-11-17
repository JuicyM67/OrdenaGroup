// WP-96b (D-080): bakgrundsfoton på skyltarna. Bara företagets egna bilder kan väljas och
// laddas; ett foto från ett annat företag eller ett omslag som inte finns avvisas.
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { defaultSignDesign } from "@/lib/share/carteles-design";
import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  dropTestBusiness,
  type TestBusiness,
} from "@/server/db/testing";

import { loadCartelData, saveSignDesign } from "./carteles";

let biz: TestBusiness;
let other: TestBusiness;
let ownImage: string;
let otherImage: string;

async function insertImage(businessId: string): Promise<string> {
  const r = await adminQuery<{ id: string }>(
    `insert into public.business_images (business_id, path)
     values ($1, $2) returning id`,
    [businessId, `${businessId}/${randomUUID()}.jpg`],
  );
  return r.rows[0]!.id;
}

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness();
  other = await createTestBusiness();
  ownImage = await insertImage(biz.id);
  otherImage = await insertImage(other.id);
  // En bild som inte är en uppladdad fil (sökvägen följer inte mönstret) visas aldrig.
  await adminQuery(
    `insert into public.business_images (business_id, path) values ($1, $2)`,
    [biz.id, `${biz.id}/demo/cl/x.webp`],
  );
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await dropTestBusiness(other);
  await closePool();
});

function withPhoto(foto: string) {
  return { ...defaultSignDesign("reservas"), fondo: { tipo: "foto", foto } };
}

describe("carteles: fondos con foto (WP-96b)", () => {
  it("loadCartelData trae solo las fotos propias del negocio", async () => {
    const data = await loadCartelData(biz.ownerUserId, biz.id);
    expect(data.business.fotos.map((f) => f.id)).toEqual([ownImage]);
    expect(data.business.fotos[0]!.url).toContain(`${biz.id}/`);
  });

  it("guarda una foto propia y la vuelve a leer", async () => {
    const r = await saveSignDesign(
      biz.ownerUserId,
      biz.id,
      "reservas",
      withPhoto(ownImage),
    );
    expect(r.ok).toBe(true);
    const data = await loadCartelData(biz.ownerUserId, biz.id);
    expect(data.designs.reservas.fondo).toEqual({
      tipo: "foto",
      foto: ownImage,
    });
  });

  it("rechaza la foto de otro negocio y una portada que no existe", async () => {
    for (const foto of [otherImage, "portada"]) {
      expect(
        await saveSignDesign(
          biz.ownerUserId,
          biz.id,
          "reservas",
          withPhoto(foto),
        ),
      ).toEqual({ ok: false, code: "invalid" });
    }
  });

  it("guarda un patrón", async () => {
    const r = await saveSignDesign(biz.ownerUserId, biz.id, "cuenta", {
      ...defaultSignDesign("cuenta"),
      fondo: { tipo: "patron", patron: "hojas" },
    });
    expect(r.ok).toBe(true);
  });
});
