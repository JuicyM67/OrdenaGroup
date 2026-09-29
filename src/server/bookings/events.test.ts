import { beforeEach, describe, expect, it, vi } from "vitest";

import { err, ok } from "@/server/scheduling/result";

/**
 * WP-16 steg 3: motorn köar rätt händelse EFTER commit (runAs har
 * returnerat), aldrig vid fel, och inget nytt vid omförsök/redan avbokad.
 * Utkorgen och transaktionen mockas — här testas bara kopplingen.
 */
const { enqueueBookingEvent, runAs } = vi.hoisted(() => ({
  enqueueBookingEvent: vi.fn<(e: unknown) => Promise<void>>(async () => {}),
  runAs: vi.fn(),
}));
vi.mock("@/server/messaging/outbox", () => ({
  enqueueBookingEvent,
  kickOutbox: vi.fn(async () => {}),
}));
vi.mock("@/server/scheduling/run", () => ({ runAs }));

const { createBooking } = await import("./create");
const { moveBooking } = await import("./move");
const { cancelBooking } = await import("./cancel");

const BIZ = "b0000000-0000-4000-8000-000000000001";
const BOOKING = "b0000000-0000-4000-8000-0000000000aa";
const SERVICE = "b0000000-0000-4000-8000-0000000000bb";
const STAFF = "b0000000-0000-4000-8000-0000000000cc";
const TOKEN = "A".repeat(43);
const NEW_TOKEN = "B".repeat(43);
const NOW = new Date(Date.UTC(2026, 9, 1, 12));
const START = "2026-10-06T13:00:00.000Z";
const customer = { kind: "customer" as const };
const owner = {
  kind: "owner" as const,
  userId: "b0000000-0000-4000-8000-0000000000dd",
};

const created = (manageToken: string) => ({
  id: BOOKING,
  businessId: BIZ,
  staffId: STAFF,
  serviceId: SERVICE,
  customerId: "c",
  start: START,
  end: START,
  priceClp: 12000,
  discountClp: 0,
  depositClp: 0,
  status: "confirmed",
  manageToken,
});

const createRequest = {
  serviceId: SERVICE,
  staffId: STAFF,
  start: START,
  customer: { phone: "+56912345678", name: "Cliente", email: "a@b.cl" },
};

beforeEach(() => {
  enqueueBookingEvent.mockClear();
  runAs.mockReset();
});

describe("createBooking → created", () => {
  it.each([
    ["customer", customer],
    ["owner", owner],
  ] as const)(
    "%s: köar created med klartext-token efter commit",
    async (by, actor) => {
      const order: string[] = [];
      runAs.mockImplementation(async () => {
        order.push("commit");
        return ok(created(TOKEN));
      });
      enqueueBookingEvent.mockImplementationOnce(async () => {
        order.push("enqueue");
      });
      const r = await createBooking(createRequest, {
        businessId: BIZ,
        actor,
        now: NOW,
      });
      expect(r.ok).toBe(true);
      expect(order).toEqual(["commit", "enqueue"]);
      expect(enqueueBookingEvent).toHaveBeenCalledExactlyOnceWith({
        type: "created",
        bookingId: BOOKING,
        businessId: BIZ,
        token: TOKEN,
        by,
      });
    },
  );

  it("omförsök med samma idempotensnyckel (ingen token) köar inget", async () => {
    runAs.mockResolvedValue(ok(created("")));
    await createBooking(createRequest, {
      businessId: BIZ,
      actor: customer,
      now: NOW,
    });
    expect(enqueueBookingEvent).not.toHaveBeenCalled();
  });

  it("fel (t.ex. slot_taken) köar inget", async () => {
    runAs.mockResolvedValue(err("slot_taken"));
    await createBooking(createRequest, {
      businessId: BIZ,
      actor: customer,
      now: NOW,
    });
    expect(enqueueBookingEvent).not.toHaveBeenCalled();
  });
});

describe("moveBooking → moved", () => {
  const moved = {
    booking: {
      id: BOOKING,
      businessId: BIZ,
      staffId: STAFF,
      serviceId: SERVICE,
      start: START,
      end: START,
      priceClp: 12000,
      status: "confirmed",
      manageToken: NEW_TOKEN,
    },
    freed: { staffId: STAFF, blocked: { start: 0, end: 1 } },
  };

  it("kund: köar moved med den NYA token (D-029)", async () => {
    runAs.mockResolvedValue(ok(moved));
    await moveBooking(
      { manageToken: TOKEN, newStart: START },
      { businessId: BIZ, actor: customer, now: NOW },
    );
    expect(enqueueBookingEvent).toHaveBeenCalledExactlyOnceWith({
      type: "moved",
      bookingId: BOOKING,
      businessId: BIZ,
      token: NEW_TOKEN,
      by: "customer",
    });
  });

  it("ägare: by = owner", async () => {
    runAs.mockResolvedValue(ok(moved));
    await moveBooking(
      { bookingId: BOOKING, newStart: START },
      { businessId: BIZ, actor: owner, now: NOW },
    );
    expect(enqueueBookingEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "moved", by: "owner" }),
    );
  });

  it("fel köar inget", async () => {
    runAs.mockResolvedValue(err("outside_cancel_window"));
    await moveBooking(
      { manageToken: TOKEN, newStart: START },
      { businessId: BIZ, actor: customer, now: NOW },
    );
    expect(enqueueBookingEvent).not.toHaveBeenCalled();
  });
});

describe("cancelBooking → cancelled", () => {
  it.each([
    ["customer", customer, { manageToken: TOKEN }],
    ["owner", owner, { bookingId: BOOKING }],
  ] as const)("%s: köar cancelled (utan token)", async (by, actor, request) => {
    runAs.mockResolvedValue(
      ok({
        bookingId: BOOKING,
        freed: { staffId: STAFF, blocked: { start: 0, end: 1 } },
      }),
    );
    await cancelBooking(request, { businessId: BIZ, actor, now: NOW });
    expect(enqueueBookingEvent).toHaveBeenCalledExactlyOnceWith({
      type: "cancelled",
      bookingId: BOOKING,
      businessId: BIZ,
      by,
    });
  });

  it("redan avbokad (freed = null) köar inget nytt", async () => {
    runAs.mockResolvedValue(ok({ bookingId: BOOKING, freed: null }));
    await cancelBooking(
      { manageToken: TOKEN },
      { businessId: BIZ, actor: customer, now: NOW },
    );
    expect(enqueueBookingEvent).not.toHaveBeenCalled();
  });

  it("fel köar inget", async () => {
    runAs.mockResolvedValue(err("not_found"));
    await cancelBooking(
      { manageToken: TOKEN },
      { businessId: BIZ, actor: customer, now: NOW },
    );
    expect(enqueueBookingEvent).not.toHaveBeenCalled();
  });
});
