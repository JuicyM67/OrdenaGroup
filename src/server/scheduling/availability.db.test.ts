import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  fromLocal,
  SANTIAGO,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";
import type { Queryable } from "@/server/db/pool";
import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  dropTestBusiness,
  insertTestBooking,
  insertTestTimeOff,
  type TestBusiness,
} from "@/server/db/testing";
import { withServiceTx } from "@/server/db/tx";

import { split } from "./__fixtures__/contract";
import {
  availableDaysIn,
  getAvailableDays as realDays,
  getAvailableSlots as realSlots,
} from "./availability";
type Flat = Parameters<typeof split>[0];
const getAvailableDays = (x: Flat) => realDays(...split(x));
const getAvailableSlots = (x: Flat) => realSlots(...split(x));

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();

const TUE = "2026-10-06";
const NOW = new Date(at("2026-10-01", "09:00"));
const customer = { kind: "customer" as const };

let biz: TestBusiness;
let other: TestBusiness;
let late: TestBusiness;

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness();
  other = await createTestBusiness();
  late = await createTestBusiness({
    hours: [
      { weekday: 6, start: "22:00", end: "24:00" },
      { weekday: 7, start: "00:00", end: "02:00" },
    ],
    staff: [{ key: "diego" }],
    services: [{ key: "s30", durationMin: 30, priceClp: 5000 }],
    settings: { slotIntervalMinutes: 30 },
  });
  await insertTestTimeOff(biz, {
    start: at(TUE, "13:30"),
    end: at(TUE, "14:30"),
    kind: "lunch",
  });
  await insertTestBooking(biz, {
    start: at(TUE, "11:00"),
    durationMin: 35,
    staffKey: "diego",
  });
  await insertTestBooking(biz, {
    start: at(TUE, "15:00"),
    durationMin: 35,
    staffKey: "diego",
  });
  // Avbokad blockerar inte.
  await insertTestBooking(biz, {
    start: at(TUE, "10:00"),
    durationMin: 35,
    staffKey: "diego",
    status: "cancelled",
  });
  // Matías fullbokad onsdag 7 okt.
  await insertTestBooking(biz, {
    start: at("2026-10-07", "10:00"),
    durationMin: 540,
    staffKey: "matias",
  });
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await dropTestBusiness(other);
  await dropTestBusiness(late);
  await closePool();
});

function grid(from: string, to: string, step = 15): string[] {
  const out: string[] = [];
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  for (let m = toMin(from); m <= toMin(to); m += step) {
    out.push(
      `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
    );
  }
  return out;
}

describe("getAvailableSlots mot databasen", () => {
  it("Corte clásico en vanlig tisdag med lunch och två bokningar (ägare, alla tider)", async () => {
    const r = await getAvailableSlots({
      businessId: biz.id,
      serviceId: biz.services.corte!,
      staffId: biz.staff.diego!,
      date: TUE,
      actor: { kind: "owner", userId: biz.ownerUserId },
      now: NOW,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.map((s) => s.time)).toEqual([
      "10:00",
      "10:15",
      "11:35",
      ...grid("11:45", "12:45"),
      "15:35",
      ...grid("15:45", "18:15"),
    ]);
    expect(r.value[0]).toEqual({
      start: "2026-10-06T13:00:00.000Z",
      time: "10:00",
      end: "2026-10-06T13:35:00.000Z",
      staffIds: [biz.staff.diego],
    });
  });

  it("kund: högst 12, alla ur ägarens mängd", async () => {
    const base = {
      businessId: biz.id,
      serviceId: biz.services.corte!,
      staffId: biz.staff.diego!,
      date: TUE,
      now: NOW,
    };
    const c = await getAvailableSlots({ ...base, actor: customer });
    const o = await getAvailableSlots({
      ...base,
      actor: { kind: "owner", userId: biz.ownerUserId },
    });
    expect(c.ok && o.ok).toBe(true);
    if (!c.ok || !o.ok) return;
    expect(c.value).toHaveLength(12);
    const all = new Set(o.value.map((s) => s.start));
    for (const s of c.value) expect(all.has(s.start)).toBe(true);
  });

  it("any: union över profesionales", async () => {
    const r = await getAvailableSlots({
      businessId: biz.id,
      serviceId: biz.services.corte!,
      staffId: "any",
      date: TUE,
      actor: { kind: "owner", userId: biz.ownerUserId },
      now: NOW,
    });
    if (!r.ok) throw new Error(r.error);
    const eleven = r.value.find((s) => s.time === "11:00")!;
    expect(eleven.staffIds).toEqual([biz.staff.matias, biz.staff.tomas]);
  });

  it("24:00 i databasen och 25-timmarsdagen: sex tider med dubbla etiketter", async () => {
    const r = await getAvailableSlots({
      businessId: late.id,
      serviceId: late.services.s30!,
      staffId: late.staff.diego!,
      date: "2026-04-04",
      actor: customer,
      now: new Date(at("2026-04-01", "09:00")),
    });
    if (!r.ok) throw new Error(r.error);
    expect(r.value.map((s) => s.time)).toEqual([
      "22:00",
      "22:30",
      "23:00",
      "23:30",
      "23:00",
      "23:30",
    ]);
  });

  it("felkoder", async () => {
    const base = {
      businessId: biz.id,
      serviceId: biz.services.corte!,
      staffId: biz.staff.diego!,
      date: TUE,
      actor: customer,
      now: NOW,
    };
    await adminQuery(
      "update public.services set active = false where business_id = $1 and id = $2",
      [biz.id, biz.services.barba],
    );
    expect(
      await getAvailableSlots({ ...base, serviceId: biz.services.barba! }),
    ).toEqual({
      ok: false,
      error: "service_not_offered",
    });
    expect(
      await getAvailableSlots({ ...base, serviceId: other.services.corte! }),
    ).toEqual({
      ok: false,
      error: "service_not_offered",
    });
    expect(
      await getAvailableSlots({ ...base, staffId: other.staff.diego! }),
    ).toEqual({
      ok: false,
      error: "service_not_offered",
    });
    expect(await getAvailableSlots({ ...base, date: "2026-13-01" })).toEqual({
      ok: false,
      error: "invalid_input",
    });
  });
});

describe("getAvailableDays mot databasen", () => {
  it("vecka: söndag closed, fullbokad profesional full, övriga available", async () => {
    const r = await getAvailableDays({
      businessId: biz.id,
      serviceId: biz.services.corte!,
      staffId: biz.staff.matias!,
      from: "2026-10-05",
      to: "2026-10-11",
      actor: customer,
      now: NOW,
    });
    if (!r.ok) throw new Error(r.error);
    expect(r.value.map((x) => [x.date, x.status])).toEqual([
      ["2026-10-05", "available"],
      ["2026-10-06", "available"],
      ["2026-10-07", "full"],
      ["2026-10-08", "available"],
      ["2026-10-09", "available"],
      ["2026-10-10", "available"],
      ["2026-10-11", "closed"],
    ]);
    expect(r.value.every((x) => x.hasFlash === false)).toBe(true);
  });

  it("31 dagar kör högst 6 SQL-frågor", async () => {
    let count = 0;
    const r = await withServiceTx(async (q) => {
      const counting: Queryable = {
        query: (text, values) => {
          count++;
          return q.query(text, values);
        },
      };
      return availableDaysIn(counting, {
        businessId: biz.id,
        serviceId: biz.services.corte!,
        staffId: "any",
        from: "2026-10-01" as LocalDate,
        to: "2026-10-31" as LocalDate,
        audience: "customer",
        now: NOW,
      });
    });
    expect(r.ok && r.value).toHaveLength(31);
    expect(count).toBeLessThanOrEqual(6);
  });

  it("customer: efter horisonten closed", async () => {
    const r = await getAvailableDays({
      businessId: biz.id,
      serviceId: biz.services.corte!,
      staffId: "any",
      from: "2026-10-30",
      to: "2026-11-02",
      actor: customer,
      now: NOW,
    });
    if (!r.ok) throw new Error(r.error);
    // now = 1 okt, horisont 30 dagar = 31 okt.
    expect(r.value.map((x) => x.status)).toEqual([
      "available",
      "available",
      "closed",
      "closed",
    ]);
  });
});
