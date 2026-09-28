import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  fromLocal,
  SANTIAGO,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";
import { closePool } from "@/server/db/pool";
import {
  assertLocalDatabase,
  createTestBusiness,
  dropTestBusiness,
  insertTestBooking,
  type TestBusiness,
} from "@/server/db/testing";

import { loadOwnerAgendaWeek } from "./agenda";
import { loadOwnerHoy } from "./hoy";
import { loadOwnerInicio } from "./inicio";

/**
 * WP-21: dataladdningen ger bara det egna företagets rader (tenant-
 * isolering via `withOwnerTx`/RLS, D-014), oavsett vilket `businessId` som
 * skickas in.
 */
const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();

const TUE = "2026-10-06" as LocalDate;

let bizA: TestBusiness;
let bizB: TestBusiness;

beforeAll(async () => {
  assertLocalDatabase();
  bizA = await createTestBusiness();
  bizB = await createTestBusiness();
});

afterAll(async () => {
  await dropTestBusiness(bizA);
  await dropTestBusiness(bizB);
  await closePool();
});

describe("loadOwnerAgendaWeek", () => {
  it("visar bara det egna företagets personal och bokningar", async () => {
    const now = new Date(at(TUE, "09:00"));
    const idA = await insertTestBooking(bizA, {
      start: at(TUE, "11:00"),
      durationMin: 35,
    });
    await insertTestBooking(bizB, { start: at(TUE, "11:00"), durationMin: 35 });

    const data = await loadOwnerAgendaWeek(bizA.ownerUserId, bizA.id, TUE, now);
    expect(data.bookings.map((b) => b.id)).toEqual([idA]);
    expect(data.staff.map((s) => s.name).sort()).toEqual([
      "Diego",
      "Matías",
      "Tomás",
    ]);
  });

  it("RLS: ägaren av A ser inget av B, även om businessId B skickas in", async () => {
    const now = new Date(at(TUE, "09:00"));
    const data = await loadOwnerAgendaWeek(bizA.ownerUserId, bizB.id, TUE, now);
    expect(data.staff).toEqual([]);
    expect(data.bookings).toEqual([]);
    expect(data.business.hours).toEqual({});
  });
});

describe("loadOwnerHoy", () => {
  it("visar bara dagens bokningar för det egna företaget", async () => {
    const now = new Date(at(TUE, "09:00"));
    const idA = await insertTestBooking(bizA, {
      start: at(TUE, "12:00"),
      durationMin: 35,
    });
    const data = await loadOwnerHoy(bizA.ownerUserId, bizA.id, TUE, now, "Ana");
    expect(data.bookings.map((b) => b.id)).toContain(idA);
    expect(data.closedToday).toBe(false);
    expect(data.owner).toEqual({ name: "Ana" });
  });

  it("RLS: ägaren av A ser inget av B", async () => {
    const now = new Date(at(TUE, "09:00"));
    const data = await loadOwnerHoy(bizA.ownerUserId, bizB.id, TUE, now, "Ana");
    expect(data.bookings).toEqual([]);
    expect(data.dayCount).toBe(0);
  });
});

describe("loadOwnerInicio", () => {
  it("visar det egna företagets namn och dagens reservas", async () => {
    const now = new Date(at(TUE, "09:00"));
    await insertTestBooking(bizA, { start: at(TUE, "13:00"), durationMin: 35 });
    const data = await loadOwnerInicio(bizA.ownerUserId, bizA.id, TUE, now, {
      name: "Ana",
      firstName: "Ana",
    });
    expect(data.business.name).toBe("Barbería Test");
    expect(data.stats.bookingsToday).toBeGreaterThan(0);
  });
});
