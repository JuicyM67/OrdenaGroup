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

import { markArrival } from "./arrival";

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();

const TUE = "2026-10-06" as LocalDate;

let biz: TestBusiness;

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness();
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await closePool();
});

async function counters(): Promise<{
  visits_count: number;
  no_show_count: number;
}> {
  const r = await adminQuery<{ visits_count: number; no_show_count: number }>(
    "select visits_count, no_show_count from public.customers where business_id = $1 and id = $2",
    [biz.id, biz.customerId],
  );
  return r.rows[0]!;
}

async function statusOf(id: string): Promise<string> {
  const r = await adminQuery<{ status: string }>(
    "select status from public.bookings where business_id = $1 and id = $2",
    [biz.id, id],
  );
  return r.rows[0]!.status;
}

describe("markArrival", () => {
  it("Llegó: status = completed och visits_count + 1, i samma transaktion (R7)", async () => {
    const id = await insertTestBooking(biz, {
      start: at(TUE, "11:00"),
      durationMin: 35,
    });
    const before = await counters();

    expect(await markArrival(biz.ownerUserId, biz.id, id, "completed")).toEqual(
      { ok: true },
    );

    expect(await statusOf(id)).toBe("completed");
    const after = await counters();
    expect(after.visits_count).toBe(before.visits_count + 1);
    expect(after.no_show_count).toBe(before.no_show_count);
  });

  it("No vino: status = no_show och no_show_count + 1", async () => {
    const id = await insertTestBooking(biz, {
      start: at(TUE, "12:00"),
      durationMin: 35,
    });
    const before = await counters();

    expect(await markArrival(biz.ownerUserId, biz.id, id, "no_show")).toEqual({
      ok: true,
    });

    expect(await statusOf(id)).toBe("no_show");
    const after = await counters();
    expect(after.no_show_count).toBe(before.no_show_count + 1);
    expect(after.visits_count).toBe(before.visits_count);
  });

  it("idempotent: samma status igen räknar inte om räknaren", async () => {
    const id = await insertTestBooking(biz, {
      start: at(TUE, "13:00"),
      durationMin: 35,
      status: "completed",
    });
    const before = await counters();

    expect(await markArrival(biz.ownerUserId, biz.id, id, "completed")).toEqual(
      { ok: true },
    );

    expect(await counters()).toEqual(before);
  });

  it("cancelled → invalid_status, räknaren rörs inte", async () => {
    const id = await insertTestBooking(biz, {
      start: at(TUE, "14:00"),
      durationMin: 35,
      status: "cancelled",
    });
    const before = await counters();

    expect(await markArrival(biz.ownerUserId, biz.id, id, "completed")).toEqual(
      { ok: false, error: "invalid_status" },
    );
    expect(await statusOf(id)).toBe("cancelled");
    expect(await counters()).toEqual(before);
  });

  it("okänt boknings-id → not_found", async () => {
    expect(
      await markArrival(
        biz.ownerUserId,
        biz.id,
        "00000000-0000-0000-0000-000000000000",
        "completed",
      ),
    ).toEqual({ ok: false, error: "not_found" });
  });

  it("ett annat företags ägare → not_found (tenant-isolering)", async () => {
    const other = await createTestBusiness();
    const id = await insertTestBooking(biz, {
      start: at(TUE, "15:00"),
      durationMin: 35,
    });

    expect(
      await markArrival(other.ownerUserId, other.id, id, "completed"),
    ).toEqual({ ok: false, error: "not_found" });
    expect(await statusOf(id)).not.toBe("completed");

    await dropTestBusiness(other);
  });
});
