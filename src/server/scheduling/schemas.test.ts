import { describe, expect, expectTypeOf, it } from "vitest";
import type { z } from "zod";

import {
  availableDaysRequestSchema,
  availableSlotsRequestSchema,
  createBookingRequestSchema,
  createContextSchema,
  customerCancelRequestSchema,
  customerMoveRequestSchema,
  engineContextSchema,
  ownerCancelRequestSchema,
  ownerMoveRequestSchema,
  parseContext,
} from "./schemas";

const BIZ = "0b0c7d4e-8f3a-4c1d-9e2f-1a2b3c4d5e6f";
const SVC = "1b0c7d4e-8f3a-4c1d-9e2f-1a2b3c4d5e6f";
const STAFF = "2b0c7d4e-8f3a-4c1d-9e2f-1a2b3c4d5e6f";
const USER = "3b0c7d4e-8f3a-4c1d-9e2f-1a2b3c4d5e6f";
const TOKEN = "A".repeat(43);
const now = new Date(1_790_000_000_000);

const days = {
  serviceId: SVC,
  staffId: "any",
  from: "2026-10-01",
  to: "2026-10-31",
};

const create = {
  serviceId: SVC,
  staffId: STAFF,
  start: "2026-10-06T14:00:00.000Z",
  customer: { phone: "+56912345678", name: "Camila Rojas" },
};

describe("klientscheman har bara formulärdata (typtest)", () => {
  it("create saknar actor, now, source, businessId, pris", () => {
    type In = z.input<typeof createBookingRequestSchema>;
    expectTypeOf<In>().not.toHaveProperty("actor");
    expectTypeOf<In>().not.toHaveProperty("now");
    expectTypeOf<In>().not.toHaveProperty("source");
    expectTypeOf<In>().not.toHaveProperty("businessId");
    expectTypeOf<In>().not.toHaveProperty("priceClp");
  });

  it("days/slots saknar actor, now, audience, limit, businessId", () => {
    type D = z.input<typeof availableDaysRequestSchema>;
    type S = z.input<typeof availableSlotsRequestSchema>;
    expectTypeOf<D>().not.toHaveProperty("actor");
    expectTypeOf<D>().not.toHaveProperty("now");
    expectTypeOf<D>().not.toHaveProperty("audience");
    expectTypeOf<D>().not.toHaveProperty("businessId");
    expectTypeOf<S>().not.toHaveProperty("limit");
    expectTypeOf<S>().not.toHaveProperty("audience");
    expectTypeOf<S>().not.toHaveProperty("actor");
  });

  it("kundens flytt/avbokning har token men inget bookingId", () => {
    type M = z.input<typeof customerMoveRequestSchema>;
    type C = z.input<typeof customerCancelRequestSchema>;
    expectTypeOf<M>().toHaveProperty("manageToken");
    expectTypeOf<M>().not.toHaveProperty("bookingId");
    expectTypeOf<C>().not.toHaveProperty("bookingId");
    expectTypeOf<C>().not.toHaveProperty("by");
  });

  it.each([
    ["actor", { actor: { kind: "owner", userId: USER } }],
    ["now", { now }],
    ["source", { source: "manual" }],
    ["businessId", { businessId: BIZ }],
    ["priceClp", { priceClp: 1 }],
  ])("create avvisar %s vid körning", (_n, patch) => {
    expect(
      createBookingRequestSchema.safeParse({ ...create, ...patch }).success,
    ).toBe(false);
  });

  it.each([
    ["audience", { audience: "owner" }],
    ["limit", { limit: 500 }],
    ["actor", { actor: { kind: "customer" } }],
  ])("days/slots avvisar %s vid körning", (_n, patch) => {
    expect(
      availableDaysRequestSchema.safeParse({ ...days, ...patch }).success,
    ).toBe(false);
    expect(
      availableSlotsRequestSchema.safeParse({
        serviceId: SVC,
        staffId: "any",
        date: "2026-10-06",
        ...patch,
      }).success,
    ).toBe(false);
  });
});

describe("availableDaysRequestSchema", () => {
  it("godtar giltig indata; 62 dagar godtas", () => {
    expect(availableDaysRequestSchema.safeParse(days).success).toBe(true);
    expect(
      availableDaysRequestSchema.safeParse({ ...days, to: "2026-12-01" })
        .success,
    ).toBe(true);
  });

  it.each([
    ["ogiltig uuid", { serviceId: "abc" }],
    ["staffId varken uuid eller any", { staffId: "cualquiera" }],
    ["from > to", { from: "2026-10-31", to: "2026-10-01" }],
    ["mer än 62 dagar", { from: "2026-10-01", to: "2026-12-02" }],
    ["ogiltigt datum", { from: "2026-02-30" }],
  ])("%s → fel", (_n, patch) => {
    expect(
      availableDaysRequestSchema.safeParse({ ...days, ...patch }).success,
    ).toBe(false);
  });
});

describe("createBookingRequestSchema", () => {
  it("godtar giltig indata och ger start som Date", () => {
    const r = createBookingRequestSchema.safeParse(create);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.start.toISOString()).toBe("2026-10-06T14:00:00.000Z");
    }
  });

  it.each([
    ["instant utan offset", { start: "2026-10-06T14:00:00" }],
    [
      "telefon som inte är E.164",
      { customer: { phone: "912345678", name: "A" } },
    ],
    ["tomt namn", { customer: { phone: "+56912345678", name: "  " } }],
    [
      "ogiltig e-post",
      { customer: { phone: "+56912345678", name: "A", email: "x" } },
    ],
    ["staffId varken uuid eller any", { staffId: "Diego" }],
    [
      "extra fält i kunden",
      { customer: { phone: "+56912345678", name: "A", consent: true } },
    ],
  ])("%s → fel", (_n, patch) => {
    expect(
      createBookingRequestSchema.safeParse({ ...create, ...patch }).success,
    ).toBe(false);
  });

  it("any godtas som staffId", () => {
    expect(
      createBookingRequestSchema.safeParse({ ...create, staffId: "any" })
        .success,
    ).toBe(true);
  });
});

describe("flytt och avbokning", () => {
  it("kund: token krävs, bookingId avvisas", () => {
    const m = { manageToken: TOKEN, newStart: "2026-10-06T15:00:00Z" };
    expect(customerMoveRequestSchema.safeParse(m).success).toBe(true);
    expect(
      customerMoveRequestSchema.safeParse({ ...m, bookingId: STAFF }).success,
    ).toBe(false);
    expect(
      customerMoveRequestSchema.safeParse({ ...m, manageToken: "kort" })
        .success,
    ).toBe(false);
    expect(
      customerCancelRequestSchema.safeParse({ bookingId: STAFF }).success,
    ).toBe(false);
  });

  it("ägare: bookingId krävs", () => {
    const m = { bookingId: STAFF, newStart: "2026-10-06T15:00:00Z" };
    expect(ownerMoveRequestSchema.safeParse(m).success).toBe(true);
    expect(
      ownerMoveRequestSchema.safeParse({ ...m, newStaffId: "any" }).success,
    ).toBe(true);
    expect(
      ownerMoveRequestSchema.safeParse({ ...m, newStart: "mañana" }).success,
    ).toBe(false);
    expect(
      ownerCancelRequestSchema.safeParse({
        bookingId: STAFF,
        reason: "x".repeat(501),
      }).success,
    ).toBe(false);
  });
});

describe("betrodd kontext", () => {
  it("giltig kontext godtas", () => {
    const ctx = { businessId: BIZ, actor: { kind: "customer" }, now };
    expect(parseContext(engineContextSchema, ctx)).toEqual(ctx);
    expect(
      parseContext(createContextSchema, { ...ctx, source: "waitlist" }).source,
    ).toBe("waitlist");
  });

  it.each([
    ["now som sträng", { now: "2026-10-01T00:00:00Z" }],
    ["ogiltig Date", { now: new Date(Number.NaN) }],
    ["owner utan userId", { actor: { kind: "owner" } }],
    ["businessId saknas", { businessId: undefined }],
  ])("%s → TypeError (programmeringsfel)", (_n, patch) => {
    expect(() =>
      parseContext(engineContextSchema, {
        businessId: BIZ,
        actor: { kind: "customer" },
        now,
        ...patch,
      }),
    ).toThrow(TypeError);
  });

  it("källan manual/web kan inte sättas via kontexten", () => {
    expect(() =>
      parseContext(createContextSchema, {
        businessId: BIZ,
        actor: { kind: "customer" },
        now,
        source: "manual",
      }),
    ).toThrow(TypeError);
  });
});
