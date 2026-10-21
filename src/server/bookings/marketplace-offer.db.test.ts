import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  fromLocal,
  SANTIAGO,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";
import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  dropTestBusiness,
  type TestBusiness,
} from "@/server/db/testing";

// D-060: oberoende av testmiljöns nödbroms (`NEXT_PUBLIC_MARKETPLACE`).
vi.mock("@/config/marketplace", async (orig) => ({
  ...(await orig<typeof import("@/config/marketplace")>()),
  marketplaceEnabled: () => true,
}));

const { createBooking } = await import("./__fixtures__/flat");

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();
const iso = (ms: number) => new Date(ms).toISOString();
const TUE = "2026-10-06";
const NOW = new Date(at("2026-10-01", "09:00"));

let biz: TestBusiness;
let other: TestBusiness;
let offerId: string;
let draftId: string;
let otherOfferId: string;
let phoneSeq = 0;
const phone = () => `+5697${String(1_000_000 + ++phoneSeq).slice(-7)}`;

async function insertOffer(
  b: TestBusiness,
  slug: string,
  status: string,
): Promise<string> {
  const r = await adminQuery<{ id: string }>(
    `insert into public.offers (business_id, service_id, slug, title,
            regular_price_minor, offer_price_minor, currency, category, status)
     values ($1, $2, $3, $3, 1, 9000, 'CLP', 'har', $4) returning id`,
    [b.id, b.services.corte, slug, status],
  );
  return r.rows[0]!.id;
}

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness({
    services: [
      { key: "corte", durationMin: 35, priceClp: 12000 },
      { key: "barba", durationMin: 20, priceClp: 8000 },
    ],
  });
  other = await createTestBusiness({
    services: [{ key: "corte", durationMin: 35, priceClp: 12000 }],
  });
  for (const b of [biz, other]) {
    await adminQuery(
      `update public.businesses set plan = 'equipo' where id = $1`,
      [b.id],
    );
  }
  const suffix = biz.id.slice(0, 8);
  offerId = await insertOffer(biz, `mp-ok-${suffix}`, "published");
  draftId = await insertOffer(biz, `mp-draft-${suffix}`, "draft");
  otherOfferId = await insertOffer(other, `mp-other-${suffix}`, "published");
});

afterAll(async () => {
  for (const b of [biz, other]) await dropTestBusiness(b);
  await closePool();
});

function base(over: Record<string, unknown> = {}) {
  return {
    businessId: biz.id,
    serviceId: biz.services.corte!,
    staffId: biz.staff.diego!,
    start: iso(at(TUE, "11:00")),
    customer: { phone: phone(), name: "Camila Rojas" },
    source: "web" as const,
    actor: { kind: "customer" as const },
    now: NOW,
    ...over,
  };
}

async function row(id: string) {
  const r = await adminQuery<{
    price_clp: number;
    discount_clp: number;
    marketplace_offer_id: string | null;
  }>(
    `select price_clp, discount_clp, marketplace_offer_id
       from public.bookings where id = $1`,
    [id],
  );
  return r.rows[0]!;
}

describe("bokning till erbjudandepris (D-060)", () => {
  it("publicerat erbjudande för tjänsten → rabatt = ordinarie − erbjudandepris, länk sparas", async () => {
    const r = await createBooking(base({ marketplaceOfferId: offerId }));
    if (!r.ok) throw new Error(r.error);
    expect(r.value).toMatchObject({
      priceClp: 12000,
      discountClp: 3000,
      discountReason: "marketplace",
    });
    expect(await row(r.value.id)).toEqual({
      price_clp: 12000,
      discount_clp: 3000,
      marketplace_offer_id: offerId,
    });
  });

  it("annan tjänst än erbjudandets → ordinarie pris", async () => {
    const r = await createBooking(
      base({
        serviceId: biz.services.barba,
        start: iso(at(TUE, "13:00")),
        marketplaceOfferId: offerId,
      }),
    );
    if (!r.ok) throw new Error(r.error);
    expect(await row(r.value.id)).toMatchObject({
      discount_clp: 0,
      marketplace_offer_id: null,
    });
  });

  it("utkast eller annat företags erbjudande → ingen rabatt", async () => {
    for (const [id, time] of [
      [draftId, "15:00"],
      [otherOfferId, "16:00"],
    ] as const) {
      const r = await createBooking(
        base({ start: iso(at(TUE, time)), marketplaceOfferId: id }),
      );
      if (!r.ok) throw new Error(r.error);
      expect(await row(r.value.id)).toMatchObject({
        discount_clp: 0,
        marketplace_offer_id: null,
      });
    }
  });

  it("utgånget försäljningsfönster → ingen rabatt", async () => {
    await adminQuery(
      `update public.offers set sale_ends_at = $2 where id = $1`,
      [offerId, iso(at("2026-09-30", "00:00"))],
    );
    try {
      const r = await createBooking(
        base({ start: iso(at(TUE, "17:00")), marketplaceOfferId: offerId }),
      );
      if (!r.ok) throw new Error(r.error);
      expect((await row(r.value.id)).discount_clp).toBe(0);
    } finally {
      await adminQuery(
        `update public.offers set sale_ends_at = null where id = $1`,
        [offerId],
      );
    }
  });
});
