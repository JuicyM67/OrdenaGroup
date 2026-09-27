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
import { split } from "@/server/scheduling/__fixtures__/contract";
import { getAvailableSlots as realSlots } from "@/server/scheduling/availability";
import { cancelBooking, createBooking } from "./__fixtures__/flat";

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();
const iso = (ms: number) => new Date(ms).toISOString();
const TUE = "2026-10-06";
const NOW = new Date(at("2026-10-01", "09:00"));
const customer = { kind: "customer" as const };

const getAvailableSlots = (x: Parameters<typeof split>[0]) =>
  realSlots(...split(x));

let biz: TestBusiness;

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness({ staff: [{ key: "diego" }] });
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await closePool();
});

async function slotsAt(time: string): Promise<boolean> {
  const r = await getAvailableSlots({
    businessId: biz.id,
    serviceId: biz.services.corte!,
    staffId: biz.staff.diego!,
    date: TUE,
    actor: { kind: "owner", userId: biz.ownerUserId },
    now: NOW,
  });
  if (!r.ok) throw new Error(r.error);
  return r.value.some((s) => s.start === iso(at(TUE, time)));
}

describe("cancelBooking", () => {
  it("sätter cancelled_at = injicerad now och cancel_reason; tiden blir ledig direkt; idempotent", async () => {
    const c = await createBooking({
      businessId: biz.id,
      serviceId: biz.services.corte!,
      staffId: biz.staff.diego!,
      start: iso(at(TUE, "11:00")),
      customer: { phone: "+56911112222", name: "Cliente" },
      source: "web",
      actor: customer,
      now: NOW,
    });
    if (!c.ok) throw new Error(c.error);
    expect(await slotsAt("11:00")).toBe(false);

    const when = new Date(at("2026-10-02", "12:34"));
    const r = await cancelBooking({
      businessId: biz.id,
      bookingId: c.value.id,
      by: "customer",
      reason: "No puedo ir",
      actor: customer,
      now: when,
    });
    expect(r).toEqual({
      ok: true,
      value: {
        bookingId: c.value.id,
        freed: {
          staffId: biz.staff.diego,
          blocked: { start: at(TUE, "11:00"), end: at(TUE, "11:35") },
        },
      },
    });
    const row = await adminQuery<{
      status: string;
      cancelled_at: Date;
      cancel_reason: string;
    }>(
      "select status, cancelled_at, cancel_reason from public.bookings where business_id = $1 and id = $2",
      [biz.id, c.value.id],
    );
    expect(row.rows[0]).toEqual({
      status: "cancelled",
      cancelled_at: when,
      cancel_reason: "No puedo ir",
    });
    expect(await slotsAt("11:00")).toBe(true);

    expect(
      await cancelBooking({
        businessId: biz.id,
        bookingId: c.value.id,
        by: "customer",
        actor: customer,
        now: when,
      }),
    ).toEqual({ ok: true, value: { bookingId: c.value.id, freed: null } });
  });

  it("kund efter avbokningsfönstret → outside_cancel_window; ägaren okej", async () => {
    const id = await insertTestBooking(biz, {
      start: at(TUE, "15:00"),
      durationMin: 35,
    });
    const now = new Date(at(TUE, "12:30"));
    expect(
      await cancelBooking({
        businessId: biz.id,
        bookingId: id,
        by: "customer",
        actor: customer,
        now,
      }),
    ).toEqual({
      ok: false,
      error: "outside_cancel_window",
    });
    const r = await cancelBooking({
      businessId: biz.id,
      bookingId: id,
      by: "owner",
      actor: { kind: "owner", userId: biz.ownerUserId },
      now,
    });
    expect(r.ok).toBe(true);
  });

  it("pending_payment kan avbokas (pending_expires_at nollas)", async () => {
    const id = await insertTestBooking(biz, {
      start: at(TUE, "17:00"),
      durationMin: 35,
      status: "pending_payment",
    });
    const r = await cancelBooking({
      businessId: biz.id,
      bookingId: id,
      by: "customer",
      actor: customer,
      now: NOW,
    });
    expect(r.ok).toBe(true);
    const row = await adminQuery<{ pending_expires_at: Date | null }>(
      "select pending_expires_at from public.bookings where business_id = $1 and id = $2",
      [biz.id, id],
    );
    expect(row.rows[0]!.pending_expires_at).toBeNull();
  });

  it.each(["completed", "no_show"] as const)(
    "%s → invalid_status",
    async (status) => {
      const id = await insertTestBooking(biz, {
        start: at("2026-10-07", "10:00"),
        durationMin: 35,
        status,
      });
      expect(
        await cancelBooking({
          businessId: biz.id,
          bookingId: id,
          by: "customer",
          actor: customer,
          now: NOW,
        }),
      ).toEqual({
        ok: false,
        error: "invalid_status",
      });
    },
  );
});
