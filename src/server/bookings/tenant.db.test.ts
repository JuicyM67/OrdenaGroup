import { afterAll, beforeAll, describe, expect, it } from "vitest";

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
  insertTestBooking,
  type TestBusiness,
} from "@/server/db/testing";
import { cancelBooking, createBooking, moveBooking } from "./__fixtures__/flat";

/** INV-4 på servern, bokningsdelen (service role med explicit business_id, och RLS för ägare). */

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();
const iso = (ms: number) => new Date(ms).toISOString();
const TUE = "2026-10-06";
const NOW = new Date(at("2026-10-01", "09:00"));
const customer = { kind: "customer" as const };

let a: TestBusiness;
let b: TestBusiness;
let bBooking: string;

beforeAll(async () => {
  assertLocalDatabase();
  a = await createTestBusiness();
  b = await createTestBusiness();
  bBooking = await insertTestBooking(b, {
    start: at(TUE, "10:00"),
    durationMin: 35,
  });
});

afterAll(async () => {
  await dropTestBusiness(a);
  await dropTestBusiness(b);
  await closePool();
});

async function snapshot() {
  const r = await adminQuery<{
    bookings: number;
    customers: number;
    brow: string;
  }>(
    `select (select count(*)::int from public.bookings where business_id = any($1::uuid[])) as bookings,
            (select count(*)::int from public.customers where business_id = any($1::uuid[])) as customers,
            (select row(staff_id, period, blocked, status, cancelled_at)::text
               from public.bookings where business_id = $2 and id = $3) as brow`,
    [[a.id, b.id], b.id, bBooking],
  );
  return r.rows[0]!;
}

function create(over: Record<string, unknown>) {
  return createBooking({
    businessId: a.id,
    serviceId: a.services.corte!,
    staffId: a.staff.diego!,
    start: iso(at(TUE, "11:00")),
    customer: { phone: "+56933334444", name: "Cliente" },
    source: "web",
    actor: customer,
    now: NOW,
    ...over,
  });
}

describe("bokningar är isolerade per företag", () => {
  it("A med B:s tjänst eller B:s profesional → service_not_offered, inga rader skapas", async () => {
    const before = await snapshot();
    expect(await create({ serviceId: b.services.corte })).toEqual({
      ok: false,
      error: "service_not_offered",
    });
    expect(await create({ staffId: b.staff.diego })).toEqual({
      ok: false,
      error: "service_not_offered",
    });
    expect(await snapshot()).toEqual(before);
  });

  it("move/cancel i A med B:s bokning → not_found och B:s rad är oförändrad", async () => {
    const before = await snapshot();
    expect(
      await moveBooking({
        businessId: a.id,
        bookingId: bBooking,
        newStart: iso(at(TUE, "12:00")),
        actor: customer,
        now: NOW,
      }),
    ).toEqual({ ok: false, error: "not_found" });
    expect(
      await cancelBooking({
        businessId: a.id,
        bookingId: bBooking,
        by: "customer",
        actor: customer,
        now: NOW,
      }),
    ).toEqual({ ok: false, error: "not_found" });
    expect(await snapshot()).toEqual(before);
  });

  it("ägare i A mot företag B (RLS) → service_not_offered/not_found, ingenting skrivs", async () => {
    const before = await snapshot();
    const ownerA = { kind: "owner" as const, userId: a.ownerUserId };
    expect(
      await createBooking({
        businessId: b.id,
        serviceId: b.services.corte!,
        staffId: b.staff.diego!,
        start: iso(at(TUE, "12:00")),
        customer: { phone: "+56933334444", name: "Cliente" },
        source: "manual",
        actor: ownerA,
        now: NOW,
      }),
    ).toEqual({ ok: false, error: "service_not_offered" });
    expect(
      await moveBooking({
        businessId: b.id,
        bookingId: bBooking,
        newStart: iso(at(TUE, "12:00")),
        actor: ownerA,
        now: NOW,
      }),
    ).toEqual({ ok: false, error: "not_found" });
    expect(
      await cancelBooking({
        businessId: b.id,
        bookingId: bBooking,
        by: "owner",
        actor: ownerA,
        now: NOW,
      }),
    ).toEqual({ ok: false, error: "not_found" });
    expect(await snapshot()).toEqual(before);
  });

  it("samma telefon i A och B ger två kunder; A:s bokning länkas aldrig till B:s kund", async () => {
    const inB = await createBooking({
      businessId: b.id,
      serviceId: b.services.corte!,
      staffId: b.staff.matias!,
      start: iso(at(TUE, "11:00")),
      customer: { phone: "+56955556666", name: "Misma" },
      source: "web",
      actor: customer,
      now: NOW,
    });
    const inA = await create({
      customer: { phone: "+56955556666", name: "Misma" },
    });
    if (!inA.ok || !inB.ok) throw new Error("setup");
    expect(inA.value.customerId).not.toBe(inB.value.customerId);
    const r = await adminQuery<{ business_id: string }>(
      "select c.business_id from public.bookings bk join public.customers c on c.id = bk.customer_id where bk.business_id = $1 and bk.id = $2",
      [a.id, inA.value.id],
    );
    expect(r.rows[0]!.business_id).toBe(a.id);
  });
});
