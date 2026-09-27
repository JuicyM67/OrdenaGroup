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
  type TestBusiness,
} from "@/server/db/testing";
import {
  getAvailableDays,
  getAvailableSlots,
} from "@/server/scheduling/availability";
import { SchedulingInfraError } from "@/server/scheduling/result";

import { cancelBooking } from "./cancel";
import { createBooking } from "./create";
import { moveBooking } from "./move";

/** Säkerhet R2: kundvägen nekas när businesses.status <> 'active'. */

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();
const iso = (ms: number) => new Date(ms).toISOString();
const TUE = "2026-10-06";
const NOW = new Date(at("2026-10-01", "09:00"));

let biz: TestBusiness;
let booked: { id: string; token: string };

const customerCtx = () => ({
  businessId: biz.id,
  actor: { kind: "customer" as const },
  now: NOW,
});
const ownerCtx = () => ({
  businessId: biz.id,
  actor: { kind: "owner" as const, userId: biz.ownerUserId },
  now: NOW,
});
const request = (time: string) => ({
  serviceId: biz.services.corte!,
  staffId: biz.staff.diego!,
  start: iso(at(TUE, time)),
  customer: { phone: "+56922220001", name: "Cliente" },
});

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness();
  const r = await createBooking(request("10:00"), customerCtx());
  if (!r.ok) throw new Error(r.error);
  booked = { id: r.value.id, token: r.value.manageToken };
  await adminQuery(
    "update public.businesses set status = 'frozen' where id = $1",
    [biz.id],
  );
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await closePool();
});

describe("fryst företag", () => {
  it("kund: tillgänglighet och createBooking → business_unavailable", async () => {
    const q = { serviceId: biz.services.corte!, staffId: "any" };
    expect(await getAvailableSlots({ ...q, date: TUE }, customerCtx())).toEqual(
      {
        ok: false,
        error: "business_unavailable",
      },
    );
    expect(
      await getAvailableDays({ ...q, from: TUE, to: TUE }, customerCtx()),
    ).toEqual({
      ok: false,
      error: "business_unavailable",
    });
    expect(await createBooking(request("12:00"), customerCtx())).toEqual({
      ok: false,
      error: "business_unavailable",
    });
    expect(
      await moveBooking(
        { manageToken: booked.token, newStart: iso(at(TUE, "12:00")) },
        customerCtx(),
      ),
    ).toEqual({ ok: false, error: "business_unavailable" });
  });

  it("kund kan ändå avboka; ägaren ser sin agenda och kan boka", async () => {
    const slots = await getAvailableSlots(
      { serviceId: biz.services.corte!, staffId: "any", date: TUE },
      ownerCtx(),
    );
    expect(slots.ok).toBe(true);
    expect((await createBooking(request("15:00"), ownerCtx())).ok).toBe(true);
    expect(
      (await cancelBooking({ manageToken: booked.token }, customerCtx())).ok,
    ).toBe(true);
  });
});

describe("anonymiserad kund återanvänds aldrig (punkt 11)", () => {
  it("anonymiserad rad med kvar telefon → infrastrukturfel, ingen bokning kopplas till den", async () => {
    await adminQuery(
      "update public.businesses set status = 'active' where id = $1",
      [biz.id],
    );
    await adminQuery(
      "update public.customers set anonymized_at = now(), name = null where business_id = $1 and phone_e164 = '+56922220001'",
      [biz.id],
    );
    const before = await adminQuery<{ n: number }>(
      "select count(*)::int as n from public.bookings where business_id = $1",
      [biz.id],
    );
    await expect(
      createBooking(request("17:00"), customerCtx()),
    ).rejects.toBeInstanceOf(SchedulingInfraError);
    const after = await adminQuery<{ n: number }>(
      "select count(*)::int as n from public.bookings where business_id = $1",
      [biz.id],
    );
    expect(after.rows[0]!.n).toBe(before.rows[0]!.n);
  });

  it("anonymiserad rad utan telefon: samma nummer ger en ny kund", async () => {
    await adminQuery(
      "update public.customers set phone_e164 = null where business_id = $1 and phone_e164 = '+56922220001'",
      [biz.id],
    );
    const r = await createBooking(request("17:00"), customerCtx());
    if (!r.ok) throw new Error(r.error);
    const c = await adminQuery<{ anonymized_at: Date | null }>(
      "select anonymized_at from public.customers where business_id = $1 and id = $2",
      [biz.id, r.value.customerId],
    );
    expect(c.rows[0]!.anonymized_at).toBeNull();
  });
});
