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

import { getAvailableDays, getAvailableSlots } from "./availability";

/** INV-4 på servern, tillgänglighetsdelen (bokningsdelen: src/server/bookings/tenant.db.test.ts). */

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();
const TUE = "2026-10-06";
const NOW = new Date(at("2026-10-01", "09:00"));

let a: TestBusiness;
let b: TestBusiness;

beforeAll(async () => {
  assertLocalDatabase();
  a = await createTestBusiness();
  b = await createTestBusiness();
  // B:s Diego är fullbokad tisdag; får aldrig påverka A.
  for (const key of ["diego", "matias", "tomas"]) {
    await insertTestBooking(b, {
      start: at(TUE, "10:00"),
      durationMin: 540,
      staffKey: key,
    });
  }
});

afterAll(async () => {
  await dropTestBusiness(a);
  await dropTestBusiness(b);
  await closePool();
});

describe("tillgänglighet är isolerad per företag", () => {
  it("B:s tjänst eller profesional i A → service_not_offered", async () => {
    const base = {
      businessId: a.id,
      serviceId: a.services.corte!,
      staffId: "any",
      date: TUE,
      actor: { kind: "customer" as const },
      now: NOW,
    };
    expect(
      await getAvailableSlots({ ...base, serviceId: b.services.corte! }),
    ).toEqual({
      ok: false,
      error: "service_not_offered",
    });
    expect(
      await getAvailableSlots({ ...base, staffId: b.staff.diego! }),
    ).toEqual({
      ok: false,
      error: "service_not_offered",
    });
  });

  it("B:s bokningar påverkar aldrig A:s tider", async () => {
    const r = await getAvailableSlots({
      businessId: a.id,
      serviceId: a.services.corte!,
      staffId: "any",
      date: TUE,
      actor: { kind: "owner", userId: a.ownerUserId },
      now: NOW,
    });
    if (!r.ok) throw new Error(r.error);
    expect(r.value[0]!.time).toBe("10:00");
    expect(r.value).toHaveLength(34);
  });

  it("ägare i A mot företag B → service_not_offered (RLS)", async () => {
    const r = await getAvailableDays({
      businessId: b.id,
      serviceId: b.services.corte!,
      staffId: "any",
      from: TUE,
      to: TUE,
      actor: { kind: "owner", userId: a.ownerUserId },
      now: NOW,
    });
    expect(r).toEqual({ ok: false, error: "service_not_offered" });
  });
});
