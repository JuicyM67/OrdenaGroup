import { describe, expect, it } from "vitest";

import {
  availableDaysInputSchema,
  availableSlotsInputSchema,
  cancelBookingInputSchema,
  createBookingInputSchema,
  moveBookingInputSchema,
} from "./schemas";

const BIZ = "0b0c7d4e-8f3a-4c1d-9e2f-1a2b3c4d5e6f";
const SVC = "1b0c7d4e-8f3a-4c1d-9e2f-1a2b3c4d5e6f";
const STAFF = "2b0c7d4e-8f3a-4c1d-9e2f-1a2b3c4d5e6f";
const USER = "3b0c7d4e-8f3a-4c1d-9e2f-1a2b3c4d5e6f";
const now = new Date(1_790_000_000_000);
const customer = { kind: "customer" as const };
const owner = { kind: "owner" as const, userId: USER };

const days = {
  businessId: BIZ,
  serviceId: SVC,
  staffId: "any",
  from: "2026-10-01",
  to: "2026-10-31",
  actor: customer,
  now,
};

const create = {
  businessId: BIZ,
  serviceId: SVC,
  staffId: STAFF,
  start: "2026-10-06T14:00:00.000Z",
  customer: { phone: "+56912345678", name: "Camila Rojas" },
  source: "web",
  actor: customer,
  now,
};

describe("availableDaysInputSchema", () => {
  it("godtar giltig indata och ger audience från aktören", () => {
    const r = availableDaysInputSchema.safeParse(days);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.audience).toBe("customer");
    const o = availableDaysInputSchema.safeParse({ ...days, actor: owner });
    expect(o.success && o.data.audience).toBe("owner");
  });

  it("ägaren kan be om kundvyn, kunden aldrig om ägarvyn", () => {
    expect(
      availableDaysInputSchema.safeParse({
        ...days,
        actor: owner,
        audience: "customer",
      }).success,
    ).toBe(true);
    expect(
      availableDaysInputSchema.safeParse({ ...days, audience: "owner" })
        .success,
    ).toBe(false);
  });

  it.each([
    ["ogiltig uuid", { businessId: "abc" }],
    ["staffId varken uuid eller any", { staffId: "cualquiera" }],
    ["from > to", { from: "2026-10-31", to: "2026-10-01" }],
    ["mer än 62 dagar", { from: "2026-10-01", to: "2026-12-02" }],
    ["ogiltigt datum", { from: "2026-02-30" }],
    ["now är ingen Date", { now: "2026-10-01T00:00:00Z" }],
    ["ogiltig Date", { now: new Date(Number.NaN) }],
    ["extra fält", { price: 1 }],
    ["owner utan userId", { actor: { kind: "owner" } }],
  ])("%s → fel", (_n, patch) => {
    expect(
      availableDaysInputSchema.safeParse({ ...days, ...patch }).success,
    ).toBe(false);
  });

  it("62 dagar godtas", () => {
    expect(
      availableDaysInputSchema.safeParse({
        ...days,
        from: "2026-10-01",
        to: "2026-12-01",
      }).success,
    ).toBe(true);
  });
});

describe("availableSlotsInputSchema", () => {
  it("limit är ett positivt heltal", () => {
    const base = { ...days, date: "2026-10-06" } as Record<string, unknown>;
    delete base.from;
    delete base.to;
    expect(availableSlotsInputSchema.safeParse(base).success).toBe(true);
    expect(
      availableSlotsInputSchema.safeParse({ ...base, limit: 0 }).success,
    ).toBe(false);
    expect(
      availableSlotsInputSchema.safeParse({ ...base, limit: 1.5 }).success,
    ).toBe(false);
  });
});

describe("createBookingInputSchema", () => {
  it("godtar giltig indata och ger start som Date", () => {
    const r = createBookingInputSchema.safeParse(create);
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
    ["eget pris (extra fält avvisas)", { priceClp: 1 }],
    ["källa flash (WP-30)", { source: "flash" }],
    ["staffId varken uuid eller any", { staffId: "Diego" }],
    [
      "extra fält i kunden",
      { customer: { phone: "+56912345678", name: "A", consent: true } },
    ],
  ])("%s → fel", (_n, patch) => {
    expect(
      createBookingInputSchema.safeParse({ ...create, ...patch }).success,
    ).toBe(false);
  });

  it("any godtas som staffId", () => {
    expect(
      createBookingInputSchema.safeParse({ ...create, staffId: "any" }).success,
    ).toBe(true);
  });
});

describe("moveBookingInputSchema / cancelBookingInputSchema", () => {
  it("flytt", () => {
    const m = {
      businessId: BIZ,
      bookingId: STAFF,
      newStart: "2026-10-06T15:00:00Z",
      actor: owner,
      now,
    };
    expect(moveBookingInputSchema.safeParse(m).success).toBe(true);
    expect(
      moveBookingInputSchema.safeParse({ ...m, newStaffId: "any" }).success,
    ).toBe(true);
    expect(
      moveBookingInputSchema.safeParse({ ...m, newStart: "mañana" }).success,
    ).toBe(false);
  });

  it("avbokning: by måste stämma med aktören", () => {
    const c = {
      businessId: BIZ,
      bookingId: STAFF,
      by: "owner",
      actor: owner,
      now,
    };
    expect(cancelBookingInputSchema.safeParse(c).success).toBe(true);
    expect(
      cancelBookingInputSchema.safeParse({ ...c, actor: customer }).success,
    ).toBe(false);
    expect(
      cancelBookingInputSchema.safeParse({ ...c, reason: "x".repeat(501) })
        .success,
    ).toBe(false);
  });
});
