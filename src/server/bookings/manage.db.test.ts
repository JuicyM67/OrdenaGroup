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

import { createBooking } from "./create";
import { cancelByToken, loadBookingByToken } from "./manage";
import { moveBooking } from "./move";
import { createManageToken } from "./token";

/** WP-16 steg 3 (D-029): `/r/[token]` mot riktig databas. */

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();
const iso = (ms: number) => new Date(ms).toISOString();
const TUE = "2026-10-06";
const NOW = new Date(at("2026-10-01", "09:00"));

let biz: TestBusiness;
let other: TestBusiness;

async function book(b: TestBusiness, time: string, phone: string) {
  const r = await createBooking(
    {
      serviceId: b.services.corte!,
      staffId: b.staff.diego!,
      start: iso(at(TUE, time)),
      customer: { phone, name: "Cliente", email: "cliente@example.com" },
    },
    { businessId: b.id, actor: { kind: "customer" }, now: NOW },
  );
  if (!r.ok) throw new Error(r.error);
  return { id: r.value.id, token: r.value.manageToken };
}

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness();
  other = await createTestBusiness();
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await dropTestBusiness(other);
  await closePool();
});

describe("loadBookingByToken", () => {
  it("okänd token → null", async () => {
    expect(await loadBookingByToken(createManageToken().token, NOW)).toBeNull();
  });

  it("känd token → rätt företag och bokning, avbokning tillåten", async () => {
    const x = await book(biz, "10:00", "+56915550001");
    await book(other, "10:00", "+56915550002");
    const b = await loadBookingByToken(x.token, NOW);
    expect(b).toMatchObject({
      businessId: biz.id,
      bookingId: x.id,
      start: iso(at(TUE, "10:00")),
      status: "confirmed",
      canCancel: true,
    });
    // Inga kunduppgifter i resultatet.
    expect(JSON.stringify(b)).not.toContain("+56915550001");
    expect(JSON.stringify(b)).not.toContain("cliente@example.com");
  });

  it("efter flytt: gammal token → null, ny token → bokningen på nya tiden", async () => {
    const x = await book(biz, "11:00", "+56915550003");
    const moved = await moveBooking(
      { bookingId: x.id, newStart: iso(at(TUE, "15:00")) },
      {
        businessId: biz.id,
        actor: { kind: "owner", userId: biz.ownerUserId },
        now: NOW,
      },
    );
    if (!moved.ok) throw new Error(moved.error);
    expect(await loadBookingByToken(x.token, NOW)).toBeNull();
    expect(await cancelByToken(x.token, NOW)).toEqual({
      ok: false,
      error: "not_found",
    });
    const b = await loadBookingByToken(moved.value.booking.manageToken, NOW);
    expect(b?.bookingId).toBe(x.id);
    expect(b?.start).toBe(iso(at(TUE, "15:00")));
  });
});

describe("cancelByToken", () => {
  it("avbokar som kund, idempotent, och status syns via token", async () => {
    const x = await book(biz, "12:00", "+56915550004");
    const r = await cancelByToken(x.token, NOW);
    expect(r).toEqual({ ok: true, value: { bookingId: x.id } });
    expect(await cancelByToken(x.token, NOW)).toEqual(r);
    const row = await adminQuery<{ status: string }>(
      "select status from public.bookings where business_id = $1 and id = $2",
      [biz.id, x.id],
    );
    expect(row.rows[0]!.status).toBe("cancelled");
    const b = await loadBookingByToken(x.token, NOW);
    expect(b?.status).toBe("cancelled");
    expect(b?.canCancel).toBe(false);
  });

  it("utanför fönstret → outside_cancel_window, canCancel false", async () => {
    const x = await book(biz, "16:00", "+56915550005");
    const late = new Date(at(TUE, "14:00"));
    expect((await loadBookingByToken(x.token, late))?.canCancel).toBe(false);
    expect(await cancelByToken(x.token, late)).toEqual({
      ok: false,
      error: "outside_cancel_window",
    });
  });
});
