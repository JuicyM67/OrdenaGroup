import { describe, expect, it } from "vitest";

import type { BookingPageData } from "@/components/booking/types";

import { voucherPageData, voucherSelection } from "./booking-page";

const data = {
  now: "2026-10-11T10:00:00Z",
  business: { slug: "s", name: "S", onlinePayment: "required", waitlist: true },
  services: [
    { id: "a", name: "A", durationMin: 30, priceClp: 50000, tint: "lime" },
    { id: "b", name: "B", durationMin: 30, priceClp: 30000, tint: "lime" },
  ],
  staff: [],
  categories: [{ id: "c", name: "C" }],
  availability: {
    a: {
      any: [
        {
          date: "2026-10-12",
          state: "open",
          hasFlash: true,
          slots: [
            {
              id: "2026-10-12T08:00:00Z",
              start: "2026-10-12T08:00:00Z",
              priceClp: 40000,
              originalPriceClp: 50000,
              discountPct: 20,
            },
            {
              id: "2026-10-12T12:00:00Z",
              start: "2026-10-12T12:00:00Z",
              priceClp: 50000,
            },
          ],
        },
        { date: "2026-10-13", state: "full", hasFlash: false, slots: [] },
        {
          date: "2026-10-14",
          state: "open",
          hasFlash: false,
          slots: [
            {
              id: "2026-10-14T08:00:00Z",
              start: "2026-10-14T08:00:00Z",
              priceClp: 50000,
            },
          ],
        },
      ],
    },
    b: { any: [] },
  },
} as unknown as BookingPageData;

describe("voucherPageData (WP-69)", () => {
  const out = voucherPageData(data, {
    serviceId: "a",
    expiresAt: new Date("2026-10-12T10:00:00Z"),
  });

  it("bara värdebevisets tjänst, ingen onlinebetalning eller väntelista", () => {
    expect(out.services.map((s) => s.id)).toEqual(["a"]);
    expect(Object.keys(out.availability)).toEqual(["a"]);
    expect(out.business.onlinePayment).toBe("off");
    expect(out.business.waitlist).toBe(false);
  });

  it("tider efter utgången och fulla dagar tas bort, blixtpris visas inte", () => {
    const days = out.availability.a?.any ?? [];
    expect(days).toHaveLength(1);
    expect(days[0]?.slots).toEqual([
      {
        id: "2026-10-12T08:00:00Z",
        start: "2026-10-12T08:00:00Z",
        priceClp: 50000,
      },
    ]);
    expect(days[0]?.hasFlash).toBe(false);
  });

  it("väljer tjänsten och första dagen direkt", () => {
    expect(voucherSelection(out, "a")).toEqual({
      serviceId: "a",
      staffId: "any",
      date: "2026-10-12",
      slotId: null,
    });
  });

  it("okänd/inaktiv tjänst ger inga tider", () => {
    const none = voucherPageData(data, {
      serviceId: "x",
      expiresAt: new Date("2027-01-01T00:00:00Z"),
    });
    expect(none.services).toEqual([]);
  });
});
