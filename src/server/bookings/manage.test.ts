import { beforeEach, describe, expect, it, vi } from "vitest";

import { err, ok } from "@/server/scheduling/result";

import { hashManageToken } from "./token";

/**
 * WP-16 steg 3: `loadBookingByToken`/`cancelByToken` (D-029). Databasen är
 * en fejk-`Queryable` som svarar per fråga; avbokningen går via motorns
 * `cancelBooking` (mockad här, egen test i events.test.ts/cancel.db.test.ts).
 */
type Call = { text: string; values: unknown[] };
const { calls, rows, cancelBooking } = vi.hoisted(() => ({
  calls: [] as Call[],
  rows: { lookup: [] as unknown[], detail: [] as unknown[] },
  cancelBooking: vi.fn(),
}));

vi.mock("@/server/db/tx", () => ({
  withServiceTx: async <T>(fn: (q: unknown) => Promise<T>) =>
    fn({
      query: async (text: string, values: unknown[] = []) => {
        calls.push({ text, values });
        // WP-64: betalningsraden (Stripe) — ingen i de här testerna.
        if (text.includes("stripe_checkouts")) return { rows: [] };
        return {
          rows: /business_id = \$1/.test(text) ? rows.detail : rows.lookup,
        };
      },
    }),
}));
vi.mock("./cancel", () => ({ cancelBooking }));

const { loadBookingByToken, cancelByToken } = await import("./manage");

const BIZ = "b0000000-0000-4000-8000-000000000001";
const BOOKING = "b0000000-0000-4000-8000-0000000000aa";
const TOKEN = "t".repeat(43);
const H = 3_600_000;
const START = Date.UTC(2026, 9, 6, 13);

function detail(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING,
    status: "confirmed",
    price_clp: 12000,
    s: START,
    pe: START + 35 * 60_000,
    service_name: "Corte",
    staff_name: "Diego",
    business_name: "Barbería",
    slug: "barberia",
    phone: "+56223456789",
    address: "Av. Providencia 1234",
    comuna: "Providencia",
    timezone: "America/Santiago",
    cancel_window_hours: 3,
    ...overrides,
  };
}

beforeEach(() => {
  calls.length = 0;
  rows.lookup = [];
  rows.detail = [];
  cancelBooking.mockReset();
});

describe("loadBookingByToken", () => {
  it("ogiltigt format → null utan att fråga databasen", async () => {
    expect(await loadBookingByToken("kort", new Date(START))).toBeNull();
    expect(calls).toEqual([]);
  });

  it("okänd token → null", async () => {
    expect(await loadBookingByToken(TOKEN, new Date(START))).toBeNull();
    expect(calls).toHaveLength(1);
    // Uppslaget sker på hashen, aldrig på klartexten.
    expect(calls[0]!.values).toEqual([hashManageToken(TOKEN)]);
    expect(calls[0]!.values).not.toContain(TOKEN);
  });

  it("känd token → publika fält; detaljfrågan filtrerar på business_id", async () => {
    rows.lookup = [{ business_id: BIZ }];
    rows.detail = [detail()];
    const b = await loadBookingByToken(TOKEN, new Date(START - 24 * H));
    expect(b).toEqual({
      businessId: BIZ,
      bookingId: BOOKING,
      business: {
        name: "Barbería",
        slug: "barberia",
        phone: "+56223456789",
        address: "Av. Providencia 1234",
        comuna: "Providencia",
        timezone: "America/Santiago",
      },
      serviceName: "Corte",
      staffName: "Diego",
      start: "2026-10-06T13:00:00.000Z",
      end: "2026-10-06T13:35:00.000Z",
      priceClp: 12000,
      status: "confirmed",
      cancelWindowHours: 3,
      canCancel: true,
      cancelNeedsApproval: false,
    });
    expect(calls[1]!.values).toEqual([BIZ, hashManageToken(TOKEN)]);
  });

  it("canCancel följer fönstret: exakt start − 3 h ja, en ms senare nej", async () => {
    rows.lookup = [{ business_id: BIZ }];
    rows.detail = [detail()];
    expect(
      (await loadBookingByToken(TOKEN, new Date(START - 3 * H)))?.canCancel,
    ).toBe(true);
    expect(
      (await loadBookingByToken(TOKEN, new Date(START - 3 * H + 1)))?.canCancel,
    ).toBe(false);
  });

  it.each(["cancelled", "completed", "no_show"])(
    "status %s → canCancel false",
    async (status) => {
      rows.lookup = [{ business_id: BIZ }];
      rows.detail = [detail({ status })];
      const b = await loadBookingByToken(TOKEN, new Date(START - 24 * H));
      expect(b?.status).toBe(status);
      expect(b?.canCancel).toBe(false);
    },
  );
});

describe("cancelByToken", () => {
  it("ogiltigt format → not_found utan databas eller motor", async () => {
    expect(await cancelByToken("x", new Date(START))).toEqual(err("not_found"));
    expect(calls).toEqual([]);
    expect(cancelBooking).not.toHaveBeenCalled();
  });

  it("okänd token → not_found, motorn anropas inte", async () => {
    expect(await cancelByToken(TOKEN, new Date(START))).toEqual(
      err("not_found"),
    );
    expect(cancelBooking).not.toHaveBeenCalled();
  });

  it("känd token → motorns avbokning som kund i rätt företag", async () => {
    rows.lookup = [{ business_id: BIZ }];
    cancelBooking.mockResolvedValue(ok({ bookingId: BOOKING, freed: null }));
    const now = new Date(START - 24 * H);
    expect(await cancelByToken(TOKEN, now)).toEqual(ok({ bookingId: BOOKING }));
    expect(cancelBooking).toHaveBeenCalledExactlyOnceWith(
      { manageToken: TOKEN },
      { businessId: BIZ, actor: { kind: "customer" }, now },
    );
  });

  it("motorns fel skickas vidare (utanför fönstret)", async () => {
    rows.lookup = [{ business_id: BIZ }];
    cancelBooking.mockResolvedValue(err("outside_cancel_window"));
    expect(await cancelByToken(TOKEN, new Date(START))).toEqual(
      err("outside_cancel_window"),
    );
  });
});
