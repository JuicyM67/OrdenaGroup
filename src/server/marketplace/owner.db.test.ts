// WP-70 (D-056): erbjudanderedigeraren mot den lokala databasen — plan, prisvakt,
// vem som publicerar och felkoderna som UI:t visar.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  createTestUser,
  dropTestBusiness,
  dropTestUser,
  type TestBusiness,
} from "@/server/db/testing";
import { updateService } from "@/server/owner/ajustes";
import type { MediaStorage } from "@/server/owner/profile";

import {
  createOfferImageUpload,
  loadOffersEditor,
  saveOffer,
  setOfferStatus,
} from "./owner";

let biz: TestBusiness;
let free: TestBusiness;
let staffUser: string;

const storage: MediaStorage = {
  async createSignedUploadUrl() {
    return { ok: true, signedUrl: "https://storage.test/x", token: "t" };
  },
  async remove() {
    return true;
  },
};

function input(over: Record<string, unknown> = {}) {
  return {
    serviceId: biz.services.corte,
    title: "Corte + lavado",
    description: "",
    includes: ["Lavado", ""],
    terms: "",
    category: "har",
    offerPrice: "1",
    quantityTotal: null,
    saleStartsOn: null,
    saleEndsOn: null,
    validMonths: 12,
    ...over,
  };
}

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness();
  free = await createTestBusiness();
  await adminQuery(
    `update public.businesses set plan = 'equipo' where id = $1`,
    [biz.id],
  );
  staffUser = await createTestUser();
  await adminQuery(
    `insert into public.memberships (business_id, user_id, role, can_edit_catalog)
     values ($1, $2, 'staff', true)`,
    [biz.id, staffUser],
  );
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await dropTestBusiness(free);
  await dropTestUser(staffUser);
  await closePool();
});

describe("erbjudanderedigeraren (WP-70)", () => {
  it("planen måste ha erbjudanden", async () => {
    const r = await saveOffer(
      free.ownerUserId,
      free.id,
      null,
      input({ serviceId: free.services.corte }),
      storage,
    );
    expect(r).toEqual({ ok: false, code: "plan_locked" });
    expect(
      await createOfferImageUpload(
        free.ownerUserId,
        free.id,
        { contentType: "image/png", size: 1000 },
        storage,
      ),
    ).toEqual({ ok: false, code: "plan_locked" });
  });

  it("personal skapar utkast men publicerar inte; ägaren publicerar; prisvakten spärrar höjning", async () => {
    const editor = await loadOffersEditor(biz.ownerUserId, biz.id);
    const corte = editor.services.find((s) => s.id === biz.services.corte)!;
    expect(corte.lowestMinor).toBe(corte.priceMinor);

    // Erbjudandepriset måste ligga under det lägsta priset.
    expect(
      await saveOffer(
        staffUser,
        biz.id,
        null,
        input({ offerPrice: String(corte.priceMinor) }),
        storage,
      ),
    ).toEqual({ ok: false, code: "offers.price_not_below" });

    const created = await saveOffer(
      staffUser,
      biz.id,
      null,
      input({ offerPrice: String(Math.floor(corte.priceMinor / 2)) }),
      storage,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(
      await setOfferStatus(staffUser, biz.id, created.id, "published"),
    ).toEqual({ ok: false, code: "offers.publish_owner_only" });
    expect(
      await setOfferStatus(biz.ownerUserId, biz.id, created.id, "published"),
    ).toEqual({ ok: true });

    // Publicerat: personalen kan inte längre ändra det.
    expect(
      await saveOffer(staffUser, biz.id, created.id, input(), storage),
    ).toEqual({ ok: false, code: "offers.published_owner_only" });

    // Prisvakten i Inställningar → Tjänster.
    const raise = await updateService(
      biz.ownerUserId,
      biz.id,
      biz.services.corte!,
      {
        name: "Corte",
        durationMin: "35",
        priceClp: String(corte.priceMinor + 1000),
        bufferAfterMin: 0,
      },
    );
    expect(raise).toEqual({ ok: false, code: "offers.service_price_locked" });

    const after = await loadOffersEditor(biz.ownerUserId, biz.id);
    expect(after.offers[0]).toMatchObject({
      id: created.id,
      status: "published",
      includes: ["Lavado"],
    });
    expect(
      after.services.find((s) => s.id === biz.services.corte)!.priceLocked,
    ).toBe(true);
  });
});
