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

import { cancelBooking } from "./cancel";
import { createBooking } from "./create";
import { moveBooking } from "./move";
import { createManageToken } from "./token";

/** Säkerhet R1: kundens flytt/avbokning är bunden till länkens token. */

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();
const iso = (ms: number) => new Date(ms).toISOString();
const TUE = "2026-10-06";
const NOW = new Date(at("2026-10-01", "09:00"));

let biz: TestBusiness;
let other: TestBusiness;
let x: { id: string; token: string };
let y: { id: string; token: string };
let z: { id: string; token: string };

async function book(b: TestBusiness, time: string, phone: string) {
  const r = await createBooking(
    {
      serviceId: b.services.corte!,
      staffId: b.staff.diego!,
      start: iso(at(TUE, time)),
      customer: { phone, name: "Cliente" },
    },
    { businessId: b.id, actor: { kind: "customer" }, now: NOW },
  );
  if (!r.ok) throw new Error(r.error);
  return { id: r.value.id, token: r.value.manageToken };
}

async function status(b: TestBusiness, id: string) {
  const r = await adminQuery<{ status: string; s: Date }>(
    "select status, lower(period) as s from public.bookings where business_id = $1 and id = $2",
    [b.id, id],
  );
  return r.rows[0]!;
}

const ctx = (b: TestBusiness) => ({
  businessId: b.id,
  actor: { kind: "customer" as const },
  now: NOW,
});

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness();
  other = await createTestBusiness();
  x = await book(biz, "10:00", "+56911110001");
  y = await book(biz, "12:00", "+56911110002");
  z = await book(other, "10:00", "+56911110003");
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await dropTestBusiness(other);
  await closePool();
});

describe("kundvägen tar token, inte bookingId", () => {
  it("fel token (rätt form) → not_found, inget ändras", async () => {
    const wrong = createManageToken().token;
    expect(await cancelBooking({ manageToken: wrong }, ctx(biz))).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(
      await moveBooking(
        { manageToken: wrong, newStart: iso(at(TUE, "15:00")) },
        ctx(biz),
      ),
    ).toEqual({ ok: false, error: "not_found" });
    expect((await status(biz, x.id)).status).toBe("requested");
  });

  it("X:s token flyttar/avbokar bara X, aldrig Y", async () => {
    const moved = await moveBooking(
      { manageToken: x.token, newStart: iso(at(TUE, "15:00")) },
      ctx(biz),
    );
    if (!moved.ok) throw new Error(moved.error);
    expect(moved.value.booking.id).toBe(x.id);
    // D-029: flytten roterar token — den gamla länken slutar gälla.
    const rotated = moved.value.booking.manageToken;
    expect(rotated).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(rotated).not.toBe(x.token);
    expect(await cancelBooking({ manageToken: x.token }, ctx(biz))).toEqual({
      ok: false,
      error: "not_found",
    });
    const cancelled = await cancelBooking({ manageToken: rotated }, ctx(biz));
    expect(cancelled.ok && cancelled.value.bookingId).toBe(x.id);
    expect((await status(biz, x.id)).status).toBe("cancelled");
    expect((await status(biz, y.id)).status).toBe("requested");
    expect((await status(biz, y.id)).s.toISOString()).toBe(
      iso(at(TUE, "12:00")),
    );
  });

  it("token från ett annat företag → not_found", async () => {
    expect(await cancelBooking({ manageToken: z.token }, ctx(biz))).toEqual({
      ok: false,
      error: "not_found",
    });
    expect((await status(other, z.id)).status).toBe("requested");
  });

  it("kund med bookingId → invalid_input; ägare med token → invalid_input", async () => {
    expect(await cancelBooking({ bookingId: y.id } as never, ctx(biz))).toEqual(
      {
        ok: false,
        error: "invalid_input",
      },
    );
    expect(
      await cancelBooking({ manageToken: y.token } as never, {
        businessId: biz.id,
        actor: { kind: "owner", userId: biz.ownerUserId },
        now: NOW,
      }),
    ).toEqual({ ok: false, error: "invalid_input" });
    expect((await status(biz, y.id)).status).toBe("requested");
  });
});
