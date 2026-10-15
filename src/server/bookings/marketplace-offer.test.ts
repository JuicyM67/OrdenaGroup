import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/tx", () => ({ withServiceTx: vi.fn() }));

const { choosePricing } = await import("./create");
const { isMarketplaceOfferIdShape, marketplaceOfferDiscountMinor } =
  await import("./marketplace-offer");
const { marketplaceOfferPageData, marketplaceOfferSelection } =
  await import("./marketplace-offer-page");

const base = {
  memberMinor: 0,
  offerMinor: 0,
  flashMinor: 0,
  flashSlotId: null,
  offerRecipientId: null,
};

describe("choosePricing: marknadsplatsens erbjudande (D-060)", () => {
  it("ensam rabatt → orsak marketplace och erbjudandets id sparas", () => {
    expect(
      choosePricing({
        ...base,
        marketplaceMinor: 4100,
        marketplaceOfferId: "o1",
      }),
    ).toEqual({
      discountClp: 4100,
      discountReason: "marketplace",
      campaignRecipientId: null,
      flashSlotId: null,
      marketplaceOfferId: "o1",
    });
  });

  it("större blixtrabatt vinner, erbjudandet länkas inte", () => {
    const p = choosePricing({
      ...base,
      flashMinor: 5000,
      flashSlotId: "f1",
      marketplaceMinor: 4100,
      marketplaceOfferId: "o1",
    });
    expect(p.discountReason).toBe("flash");
    expect(p.discountClp).toBe(5000);
    expect(p.marketplaceOfferId).toBeNull();
  });

  it("lika med medlemsrabatten → medlem (marknadsplatsen sist)", () => {
    const p = choosePricing({
      ...base,
      memberMinor: 4100,
      marketplaceMinor: 4100,
      marketplaceOfferId: "o1",
    });
    expect(p.discountReason).toBe("member");
    expect(p.marketplaceOfferId).toBeNull();
  });

  it("utan marknadsplatsfält: oförändrat beteende", () => {
    expect(choosePricing({ ...base, offerMinor: 1000 }).discountReason).toBe(
      "offer",
    );
  });
});

describe("marketplace-offer helpers", () => {
  it("rabatten blir aldrig negativ", () => {
    expect(marketplaceOfferDiscountMinor(18000, 13900)).toBe(4100);
    expect(marketplaceOfferDiscountMinor(12000, 13900)).toBe(0);
  });

  it("id-formen kräver en uuid", () => {
    expect(
      isMarketplaceOfferIdShape("de000001-0000-0000-0009-000000000001"),
    ).toBe(true);
    expect(isMarketplaceOfferIdShape("corte-y-barba-b1")).toBe(false);
    expect(isMarketplaceOfferIdShape(undefined)).toBe(false);
  });
});

describe("marketplaceOfferPageData", () => {
  const data = {
    services: [
      {
        id: "s1",
        name: "Corte",
        durationMin: 50,
        priceClp: 18000,
        tint: "lilac",
      },
      {
        id: "s2",
        name: "Barba",
        durationMin: 20,
        priceClp: 8000,
        tint: "peach",
      },
    ],
    availability: {
      s1: {
        any: [
          {
            date: "2026-10-16",
            state: "open",
            hasFlash: true,
            slots: [
              { id: "a", start: "2026-10-16T13:00:00Z", priceClp: 18000 },
              // Blixttid billigare än erbjudandet: behåller sitt pris.
              {
                id: "b",
                start: "2026-10-16T14:00:00Z",
                priceClp: 12000,
                originalPriceClp: 18000,
              },
            ],
          },
        ],
      },
      s2: { any: [] },
    },
  } as never;

  it("erbjudandets tjänst visar erbjudandepriset med ordinarie överstruket", () => {
    const out = marketplaceOfferPageData(data, {
      serviceId: "s1",
      priceMinor: 13900,
    });
    const slots = out.availability.s1!.any![0]!.slots;
    expect(slots[0]).toMatchObject({
      priceClp: 13900,
      originalPriceClp: 18000,
    });
    expect(slots[1]).toMatchObject({ priceClp: 12000 });
    expect(out.services[0]!.priceClp).toBe(13900);
    expect(out.services[1]!.priceClp).toBe(8000);
    // Andra tjänster rörs inte.
    expect(out.availability.s2).toBe(
      (data as { availability: Record<string, unknown> }).availability.s2,
    );
  });

  it("okänd tjänst → oförändrad data och inget förval", () => {
    expect(
      marketplaceOfferPageData(data, { serviceId: "x", priceMinor: 1 }),
    ).toBe(data);
    expect(marketplaceOfferSelection(data, "x")).toBeUndefined();
  });

  it("förvalet hoppar till första öppna dagen", () => {
    expect(marketplaceOfferSelection(data, "s1")).toEqual({
      serviceId: "s1",
      staffId: "any",
      date: "2026-10-16",
      slotId: null,
    });
  });
});
