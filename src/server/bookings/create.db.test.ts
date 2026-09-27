import { createHash } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  fromLocal,
  parseInstant,
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
  insertTestBooking,
  type TestBusiness,
} from "@/server/db/testing";
import { createBooking } from "./__fixtures__/flat";
import { createBooking as realCreate } from "./create";

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();
const iso = (ms: number) => new Date(ms).toISOString();
const TUE = "2026-10-06";
const NOW = new Date(at("2026-10-01", "09:00"));
const customer = { kind: "customer" as const };

let biz: TestBusiness;
let other: TestBusiness;
let duo: TestBusiness;
let late: TestBusiness;
let phoneSeq = 0;
const phone = () => `+5698${String(1_000_000 + ++phoneSeq).slice(-7)}`;

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness({
    services: [
      { key: "corte", durationMin: 35, priceClp: 12000, bufferAfterMin: 10 },
      { key: "barba", durationMin: 20, priceClp: 8000, staff: ["matias"] },
    ],
  });
  other = await createTestBusiness();
  duo = await createTestBusiness({
    staff: [
      { key: "diego", sort: 1 },
      { key: "matias", sort: 2 },
    ],
  });
  late = await createTestBusiness({
    hours: [
      { weekday: 6, start: "22:00", end: "24:00" },
      { weekday: 7, start: "00:00", end: "02:00" },
    ],
    staff: [{ key: "diego" }],
    services: [{ key: "s30", durationMin: 30, priceClp: 5000 }],
    settings: { minNoticeMinutes: 0 },
  });
});

afterAll(async () => {
  for (const b of [biz, other, duo, late]) await dropTestBusiness(b);
  await closePool();
});

function base(b: TestBusiness, over: Record<string, unknown> = {}) {
  return {
    businessId: b.id,
    serviceId: b.services.corte!,
    staffId: b.staff.diego!,
    start: iso(at(TUE, "11:00")),
    customer: { phone: phone(), name: "Camila Rojas" },
    source: "web" as const,
    actor: customer,
    now: NOW,
    ...over,
  };
}

async function bookingRow(id: string) {
  const r = await adminQuery<{
    period: string;
    blocked: string;
    status: string;
    source: string;
    price_clp: number;
    discount_clp: number;
    deposit_clp: number;
    hash: string;
    customer_id: string;
    staff_id: string;
    pending_expires_at: Date | null;
  }>(
    `select period::text, blocked::text, status, source, price_clp, discount_clp,
            deposit_clp, encode(manage_token_hash, 'hex') as hash, customer_id,
            staff_id, pending_expires_at
       from public.bookings where id = $1`,
    [id],
  );
  return r.rows[0]!;
}

async function counts(b: TestBusiness) {
  const r = await adminQuery<{ bookings: number; customers: number }>(
    `select (select count(*)::int from public.bookings where business_id = $1) as bookings,
            (select count(*)::int from public.customers where business_id = $1) as customers`,
    [b.id],
  );
  return r.rows[0]!;
}

const range = (a: string, b: string) => {
  const x = parseInstant(a);
  const y = parseInstant(b);
  if (!x.ok || !y.ok) throw new Error("fixture");
  return `["${x.value.toISOString()}","${y.value.toISOString()}")`;
};

/** Postgres tstzrange-text → [startIso, endIso) för jämförelse. */
function rangeIso(text: string): string {
  const m = /^\["(.+)","(.+)"\)$/.exec(text)!;
  return range(m[1]!.replace(" ", "T"), m[2]!.replace(" ", "T"));
}

describe("createBooking lyckas", () => {
  it("period 35 min, blocked 35 + 10, confirmed, pris från tjänsten, hash av token", async () => {
    const r = await createBooking(base(biz));
    if (!r.ok) throw new Error(r.error);
    const b = r.value;
    expect(b).toMatchObject({
      businessId: biz.id,
      staffId: biz.staff.diego,
      serviceId: biz.services.corte,
      start: "2026-10-06T14:00:00.000Z",
      end: "2026-10-06T14:35:00.000Z",
      priceClp: 12000,
      discountClp: 0,
      depositClp: 0,
      status: "confirmed",
    });
    const row = await bookingRow(b.id);
    expect(rangeIso(row.period)).toBe(
      range("2026-10-06T14:00:00Z", "2026-10-06T14:35:00Z"),
    );
    expect(rangeIso(row.blocked)).toBe(
      range("2026-10-06T14:00:00Z", "2026-10-06T14:45:00Z"),
    );
    expect(row).toMatchObject({
      status: "confirmed",
      source: "web",
      price_clp: 12000,
      discount_clp: 0,
      deposit_clp: 0,
      customer_id: b.customerId,
      pending_expires_at: null,
    });
    expect(row.hash).toBe(
      createHash("sha256").update(b.manageToken).digest("hex"),
    );
  });

  it("klientens eget pris finns inte i schemat: extra fält avvisas och inget skrivs", async () => {
    const before = await counts(biz);
    const r = await createBooking({ ...base(biz), priceClp: 1 } as never);
    expect(r).toEqual({ ok: false, error: "invalid_input" });
    expect(await counts(biz)).toEqual(before);
  });

  it("source, actor och now kan inte skickas i request (sätts av servern)", async () => {
    const before = await counts(biz);
    const { businessId, actor, now, ...request } = base(biz, {
      start: iso(at(TUE, "13:00")),
    });
    for (const extra of [
      { source: "manual" },
      { actor: { kind: "owner", userId: biz.ownerUserId } },
      { now: NOW },
    ]) {
      expect(
        await realCreate({ ...request, ...extra } as never, {
          businessId,
          actor,
          now,
        }),
      ).toEqual({ ok: false, error: "invalid_input" });
    }
    expect(await counts(biz)).toEqual(before);
  });

  it("kund får source web; servern kan sätta waitlist via kontexten", async () => {
    const web = await createBooking(
      base(biz, { start: iso(at("2026-10-08", "10:00")) }),
    );
    const wl = await createBooking(
      base(biz, {
        start: iso(at("2026-10-08", "11:00")),
        source: "waitlist",
      }),
    );
    if (!web.ok || !wl.ok) throw new Error("setup");
    expect((await bookingRow(web.value.id)).source).toBe("web");
    expect((await bookingRow(wl.value.id)).source).toBe("waitlist");
  });

  it("ägaren bokar manuellt (RLS), source manual", async () => {
    const r = await createBooking(
      base(biz, {
        source: "manual",
        start: iso(at(TUE, "16:07")),
        actor: { kind: "owner", userId: biz.ownerUserId },
      }),
    );
    if (!r.ok) throw new Error(r.error);
    expect((await bookingRow(r.value.id)).source).toBe("manual");
  });
});

describe("kunden (FRÅGA 8)", () => {
  it("ny kund skapas med telefon och namn, alla consent_* är null", async () => {
    const p = phone();
    const r = await createBooking(
      base(biz, {
        start: iso(at(TUE, "12:00")),
        customer: { phone: p, name: "Ana Pérez", email: "ana@example.com" },
      }),
    );
    if (!r.ok) throw new Error(r.error);
    const c = await adminQuery<Record<string, unknown>>(
      `select phone_e164, name, email, consent_terms_at, consent_marketing_at,
              consent_version, consent_channel
         from public.customers where business_id = $1 and id = $2`,
      [biz.id, r.value.customerId],
    );
    expect(c.rows[0]).toEqual({
      phone_e164: p,
      name: "Ana Pérez",
      email: "ana@example.com",
      consent_terms_at: null,
      consent_marketing_at: null,
      consent_version: null,
      consent_channel: null,
    });
  });

  it("befintlig kund återanvänds och namnet skrivs inte över; annat företag ger ny kund", async () => {
    const p = phone();
    const first = await createBooking(
      base(biz, {
        start: iso(at(TUE, "15:00")),
        customer: { phone: p, name: "Original" },
      }),
    );
    const second = await createBooking(
      base(biz, {
        start: iso(at(TUE, "17:00")),
        customer: { phone: p, name: "Otro Nombre" },
      }),
    );
    const elsewhere = await createBooking(
      base(other, {
        start: iso(at(TUE, "15:00")),
        customer: { phone: p, name: "Original" },
      }),
    );
    if (!first.ok || !second.ok || !elsewhere.ok) throw new Error("setup");
    expect(second.value.customerId).toBe(first.value.customerId);
    expect(elsewhere.value.customerId).not.toBe(first.value.customerId);
    const c = await adminQuery<{ name: string }>(
      "select name from public.customers where business_id = $1 and id = $2",
      [biz.id, first.value.customerId],
    );
    expect(c.rows[0]!.name).toBe("Original");
  });

  it("slot_taken lämnar ingen ny kundrad", async () => {
    const before = await counts(biz);
    const r = await createBooking(base(biz)); // 11:00 bokades ovan
    expect(r).toEqual({ ok: false, error: "slot_taken" });
    expect(await counts(biz)).toEqual(before);
  });
});

describe("felkoder", () => {
  const cases: [string, Record<string, unknown>, string][] = [
    ["utanför öppettider", { start: iso(at(TUE, "19:00")) }, "outside_hours"],
    ["söndag", { start: iso(at("2026-10-04", "11:00")) }, "outside_hours"],
    [
      "utanför rutnätet (kund)",
      { start: iso(at(TUE, "13:07")) },
      "outside_hours",
    ],
    [
      "now + 30 min med notice 60",
      { start: iso(at(TUE, "10:30")), now: new Date(at(TUE, "10:00")) },
      "too_soon",
    ],
    [
      "dag 31 med horisont 30",
      { start: iso(at("2026-11-02", "11:00")) },
      "too_far",
    ],
  ];
  it.each(cases)("%s → %s", async (_n, patch, error) => {
    expect(await createBooking(base(biz, patch))).toEqual({ ok: false, error });
  });

  it("too_soon och too_far gäller inte ägaren", async () => {
    const owner = { kind: "owner" as const, userId: biz.ownerUserId };
    const soon = await createBooking(
      base(biz, {
        start: iso(at(TUE, "10:00")),
        now: new Date(at(TUE, "10:00")),
        actor: owner,
        source: "manual",
      }),
    );
    const far = await createBooking(
      base(biz, {
        start: iso(at("2026-11-03", "11:00")),
        actor: owner,
        source: "manual",
      }),
    );
    expect(soon.ok).toBe(true);
    expect(far.ok).toBe(true);
  });

  it("tjänst som profesionalen inte utför → service_not_offered", async () => {
    expect(
      await createBooking(
        base(biz, { serviceId: biz.services.barba, staffId: biz.staff.diego }),
      ),
    ).toEqual({ ok: false, error: "service_not_offered" });
  });

  it("inaktiv profesional → service_not_offered", async () => {
    await adminQuery(
      "update public.staff set active = false where business_id = $1 and id = $2",
      [biz.id, biz.staff.tomas],
    );
    expect(
      await createBooking(base(biz, { staffId: biz.staff.tomas })),
    ).toEqual({
      ok: false,
      error: "service_not_offered",
    });
  });
});

describe("Cualquiera", () => {
  const WED = "2026-10-07";

  it("Diego har 2 bokningar och Matías 0 samma dag → Matías; Matías upptagen → Diego", async () => {
    await insertTestBooking(duo, {
      start: at(WED, "10:00"),
      durationMin: 35,
      staffKey: "diego",
    });
    await insertTestBooking(duo, {
      start: at(WED, "17:00"),
      durationMin: 35,
      staffKey: "diego",
    });
    const first = await createBooking(
      base(duo, { staffId: "any", start: iso(at(WED, "12:00")) }),
    );
    if (!first.ok) throw new Error(first.error);
    expect(first.value.staffId).toBe(duo.staff.matias);
    // Matías har nu en bokning 12:00; nästa 12:00 måste bli Diego.
    const second = await createBooking(
      base(duo, { staffId: "any", start: iso(at(WED, "12:00")) }),
    );
    if (!second.ok) throw new Error(second.error);
    expect(second.value.staffId).toBe(duo.staff.diego);
    expect(
      await createBooking(
        base(duo, { staffId: "any", start: iso(at(WED, "12:00")) }),
      ),
    ).toEqual({
      ok: false,
      error: "slot_taken",
    });
  });
});

describe("sommartid", () => {
  it("lör 5 sep 2026 23:15 (öppet 22:00–24:00, 30 min) sparas som [03:15Z,03:45Z)", async () => {
    const r = await createBooking(
      base(late, {
        serviceId: late.services.s30,
        start: iso(at("2026-09-05", "23:15")),
        now: new Date(at("2026-09-01", "09:00")),
      }),
    );
    if (!r.ok) throw new Error(r.error);
    expect(r.value.start).toBe("2026-09-06T03:15:00.000Z");
    const row = await bookingRow(r.value.id);
    expect(rangeIso(row.period)).toBe(
      range("2026-09-06T03:15:00Z", "2026-09-06T03:45:00Z"),
    );
  });

  it("aprils dubbla timme: andra förekomsten (−04) sparas som vald och krockar inte med första (−03)", async () => {
    const now = new Date(at("2026-04-01", "09:00"));
    const second = await createBooking(
      base(late, {
        serviceId: late.services.s30,
        start: "2026-04-05T03:00:00.000Z",
        now,
      }),
    );
    const first = await createBooking(
      base(late, {
        serviceId: late.services.s30,
        start: "2026-04-05T02:00:00.000Z",
        now,
      }),
    );
    if (!second.ok || !first.ok) throw new Error("dst");
    expect(second.value.start).toBe("2026-04-05T03:00:00.000Z");
    expect(first.value.start).toBe("2026-04-05T02:00:00.000Z");
    expect(second.value.staffId).toBe(first.value.staffId);
  });
});
