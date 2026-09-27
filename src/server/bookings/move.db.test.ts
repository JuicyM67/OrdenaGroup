import { randomUUID } from "node:crypto";

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

import { createBooking } from "./create";
import { moveBooking } from "./move";

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();
const iso = (ms: number) => new Date(ms).toISOString();
const TUE = "2026-10-06";
const NOW = new Date(at("2026-10-01", "09:00"));
const customer = { kind: "customer" as const };

let biz: TestBusiness;
let owner: { kind: "owner"; userId: string };
let n = 0;

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness({
    services: [
      { key: "corte", durationMin: 35, priceClp: 12000, bufferAfterMin: 10 },
    ],
  });
  owner = { kind: "owner", userId: biz.ownerUserId };
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await closePool();
});

async function book(
  time: string,
  date = TUE,
  staffKey = "diego",
): Promise<string> {
  const r = await createBooking({
    businessId: biz.id,
    serviceId: biz.services.corte!,
    staffId: biz.staff[staffKey]!,
    start: iso(at(date, time)),
    customer: {
      phone: `+5697${String(1_000_000 + ++n).slice(-7)}`,
      name: "Cliente",
    },
    source: "web",
    actor: customer,
    now: NOW,
  });
  if (!r.ok) throw new Error(r.error);
  return r.value.id;
}

async function row(id: string) {
  const r = await adminQuery<{
    staff_id: string;
    s: number;
    pe: number;
    be: number;
    price_clp: number;
    status: string;
  }>(
    `select staff_id, price_clp, status,
            extract(epoch from lower(period))::float8 * 1000 as s,
            extract(epoch from upper(period))::float8 * 1000 as pe,
            extract(epoch from upper(blocked))::float8 * 1000 as be
       from public.bookings where business_id = $1 and id = $2`,
    [biz.id, id],
  );
  return r.rows[0]!;
}

describe("moveBooking", () => {
  it("flytt till ledig tid behåller längd, buffert och pris; returnerar frigjort intervall", async () => {
    const id = await book("10:00");
    await adminQuery(
      "update public.services set price_clp = 99000 where business_id = $1",
      [biz.id],
    );
    const r = await moveBooking({
      businessId: biz.id,
      bookingId: id,
      newStart: iso(at(TUE, "12:00")),
      actor: owner,
      now: NOW,
    });
    if (!r.ok) throw new Error(r.error);
    const x = await row(id);
    expect(x.s).toBe(at(TUE, "12:00"));
    expect((x.pe - x.s) / 60_000).toBe(35);
    expect((x.be - x.s) / 60_000).toBe(45);
    expect(x.price_clp).toBe(12000);
    expect(r.value.booking).toMatchObject({
      id,
      start: iso(at(TUE, "12:00")),
      end: iso(at(TUE, "12:35")),
      priceClp: 12000,
      staffId: biz.staff.diego,
    });
    expect(r.value.freed).toEqual({
      staffId: biz.staff.diego,
      blocked: { start: at(TUE, "10:00"), end: at(TUE, "10:45") },
    });
    await adminQuery(
      "update public.services set price_clp = 12000 where business_id = $1",
      [biz.id],
    );
  });

  it("flytt ovanpå en annan bokning → slot_taken och ingen ändring", async () => {
    const a = await book("14:00");
    await book("15:00");
    const r = await moveBooking({
      businessId: biz.id,
      bookingId: a,
      newStart: iso(at(TUE, "15:15")),
      actor: owner,
      now: NOW,
    });
    expect(r).toEqual({ ok: false, error: "slot_taken" });
    expect((await row(a)).s).toBe(at(TUE, "14:00"));
  });

  it("flytt som bara överlappar sin egen gamla tid går igenom", async () => {
    const id = await book("16:30");
    const r = await moveBooking({
      businessId: biz.id,
      bookingId: id,
      newStart: iso(at(TUE, "16:45")),
      actor: owner,
      now: NOW,
    });
    expect(r.ok).toBe(true);
    expect((await row(id)).s).toBe(at(TUE, "16:45"));
  });

  it("flytt till en annan profesional (och any)", async () => {
    const id = await book("10:00", "2026-10-08");
    const r = await moveBooking({
      businessId: biz.id,
      bookingId: id,
      newStart: iso(at("2026-10-08", "10:00")),
      newStaffId: biz.staff.matias,
      actor: owner,
      now: NOW,
    });
    if (!r.ok) throw new Error(r.error);
    expect(r.value.booking.staffId).toBe(biz.staff.matias);
    expect((await row(id)).staff_id).toBe(biz.staff.matias);
    const any = await moveBooking({
      businessId: biz.id,
      bookingId: id,
      newStart: iso(at("2026-10-08", "11:00")),
      newStaffId: "any",
      actor: owner,
      now: NOW,
    });
    expect(any.ok).toBe(true);
  });

  it.each(["cancelled", "completed", "no_show"] as const)(
    "status %s → invalid_status",
    async (status) => {
      const id = await insertTestBooking(biz, {
        start: at("2026-10-09", "10:00"),
        durationMin: 35,
        status,
      });
      expect(
        await moveBooking({
          businessId: biz.id,
          bookingId: id,
          newStart: iso(at("2026-10-09", "12:00")),
          actor: owner,
          now: NOW,
        }),
      ).toEqual({ ok: false, error: "invalid_status" });
    },
  );

  it("okänd bokning → not_found", async () => {
    expect(
      await moveBooking({
        businessId: biz.id,
        bookingId: randomUUID(),
        newStart: iso(at(TUE, "12:00")),
        actor: owner,
        now: NOW,
      }),
    ).toEqual({ ok: false, error: "not_found" });
  });

  it("kund mindre än cancel_window_hours (3 h) före start → outside_cancel_window, ägare okej", async () => {
    const id = await book("13:00", "2026-10-10");
    const now = new Date(at("2026-10-10", "10:30"));
    const move = (actor: typeof owner | typeof customer) =>
      moveBooking({
        businessId: biz.id,
        bookingId: id,
        newStart: iso(at("2026-10-10", "17:00")),
        actor,
        now,
      });
    expect(await move(customer)).toEqual({
      ok: false,
      error: "outside_cancel_window",
    });
    expect((await move(owner)).ok).toBe(true);
  });

  it("kund-flytt respekterar notice och horisont", async () => {
    const id = await book("10:00", "2026-10-13");
    const now = new Date(at("2026-10-12", "09:00"));
    expect(
      await moveBooking({
        businessId: biz.id,
        bookingId: id,
        newStart: iso(at("2026-10-12", "09:30")),
        actor: customer,
        now,
      }),
    ).toEqual({ ok: false, error: "too_soon" });
    expect(
      await moveBooking({
        businessId: biz.id,
        bookingId: id,
        newStart: iso(at("2026-11-13", "10:00")),
        actor: customer,
        now,
      }),
    ).toEqual({ ok: false, error: "too_far" });
    expect(
      (
        await moveBooking({
          businessId: biz.id,
          bookingId: id,
          newStart: iso(at("2026-10-14", "10:00")),
          actor: customer,
          now,
        })
      ).ok,
    ).toBe(true);
  });
});
