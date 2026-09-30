import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  fromLocal,
  SANTIAGO,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";
import { cancelBooking } from "@/server/bookings/cancel";
import { confirmBooking, declineBooking } from "@/server/bookings/confirm";
import { createBooking } from "@/server/bookings/create";
import { moveBooking } from "@/server/bookings/move";
import type { Perm } from "@/server/db/permissions";
import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  createTestUser,
  dropTestBusiness,
  dropTestUser,
  insertTestBooking,
  type TestBusiness,
} from "@/server/db/testing";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import { exportBusiness } from "@/server/privacy/business";
import { exportCustomer } from "@/server/privacy/customer";

import { createService, replaceBusinessHours } from "./ajustes";
import { markArrival } from "./arrival";
import { loadOwnerInicio } from "./inicio";
import { listPendingRequests } from "./requests";

/**
 * WP-46 steg 3: servern nekar det som flaggorna inte tillåter (`forbidden`)
 * och släpper igenom det de tillåter — samma regler som RLS/triggern.
 * Konton (alla `role = 'staff'`):
 * - diego: bara `can_manage_own_bookings` (default)
 * - matias: egna + `can_cancel_bookings`
 * - tomas: `can_manage_all_bookings`
 * (diego/matias/tomas har också `can_manage_team`, se beforeAll.)
 * - ana: `can_edit_catalog` + `can_edit_settings` (ingen bokningsflagga utöver default)
 */

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();
const iso = (ms: number) => new Date(ms).toISOString();
const TUE = "2026-10-06" as LocalDate;
const NOW = new Date(at("2026-10-01", "09:00"));

let biz: TestBusiness;
const users: Record<string, string> = {};
let slot = 0;

const actor = (key: string) => ({
  kind: "owner" as const,
  userId: users[key]!,
});
const ctx = (key: string) => ({
  businessId: biz.id,
  actor: actor(key),
  now: NOW,
});

async function addStaffMember(
  staffKey: string,
  perms: Partial<Record<Perm, boolean>> = {},
): Promise<void> {
  const userId = await createTestUser();
  users[staffKey] = userId;
  const cols = Object.keys(perms);
  await adminQuery(
    `insert into public.memberships (business_id, user_id, role, staff_id${cols
      .map((c) => `, ${c}`)
      .join("")})
     values ($1, $2, 'staff', $3${cols.map((_, i) => `, $${i + 4}`).join("")})`,
    [biz.id, userId, biz.staff[staffKey], ...Object.values(perms)],
  );
}

/** En ny tid varje gång (30 min isär) så att inget krockar mellan testerna. */
async function booking(
  staffKey: string,
  status: "confirmed" | "requested" = "confirmed",
): Promise<string> {
  const start = at(TUE, "10:00") + slot++ * 30 * 60_000;
  const id = await insertTestBooking(biz, {
    start,
    durationMin: 20,
    staffKey,
    serviceKey: "corte",
  });
  if (status === "requested") {
    await adminQuery(
      `update public.bookings set status = 'requested', created_at = $3
        where business_id = $1 and id = $2`,
      [biz.id, id, new Date(NOW.getTime() - 3_600_000)],
    );
  }
  return id;
}

async function statusOf(id: string): Promise<string> {
  const r = await adminQuery<{ status: string }>(
    `select status::text as status from public.bookings where business_id = $1 and id = $2`,
    [biz.id, id],
  );
  return r.rows[0]!.status;
}

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness({
    staff: [
      { key: "diego", sort: 1 },
      { key: "matias", sort: 2 },
      { key: "tomas", sort: 3 },
      { key: "ana", sort: 4 },
    ],
    services: [{ key: "corte", durationMin: 20, priceClp: 10000 }],
  });
  users.owner = biz.ownerUserId;
  // `can_manage_team` påverkar inga bokningsregler, men behövs i dag för
  // att motorn ska se `staff_services`/`staff_hours`/`time_off` (RLS ger
  // bara SELECT med den flaggan — se rapporten, db-engineer).
  await addStaffMember("diego", { can_manage_team: true });
  await addStaffMember("matias", {
    can_cancel_bookings: true,
    can_manage_team: true,
  });
  await addStaffMember("tomas", {
    can_manage_all_bookings: true,
    can_manage_team: true,
  });
  await addStaffMember("ana", {
    can_edit_catalog: true,
    can_edit_settings: true,
  });
});

afterAll(async () => {
  for (const key of ["diego", "matias", "tomas", "ana"]) {
    if (users[key]) await dropTestUser(users[key]);
  }
  await dropTestBusiness(biz);
  await closePool();
});

describe("getCurrentMember", () => {
  it("personal får sitt företag, rollen staff, staffId och effektiva flaggor", async () => {
    const cur = await getCurrentMember(users.diego!);
    expect(cur?.business.id).toBe(biz.id);
    expect(cur?.member.role).toBe("staff");
    expect(cur?.view.staffId).toBe(biz.staff.diego);
    expect(cur?.view.perms.can_manage_own_bookings).toBe(true);
    expect(cur?.view.perms.can_cancel_bookings).toBe(false);
  });

  it("ägaren har alla flaggor effektivt, utan medlemskap → null (onboarding)", async () => {
    const cur = await getCurrentMember(biz.ownerUserId);
    expect(cur?.member.role).toBe("owner");
    expect(Object.values(cur!.view.perms).every(Boolean)).toBe(true);
    const nobody = await createTestUser();
    try {
      expect(await getCurrentMember(nobody)).toBeNull();
    } finally {
      await dropTestUser(nobody);
    }
  });
});

describe("bokningar: egen vs alla", () => {
  it("egen: flyttar sin egen bokning", async () => {
    const id = await booking("diego");
    const r = await moveBooking(
      { bookingId: id, newStart: iso(at(TUE, "17:00")) },
      ctx("diego"),
    );
    expect(r.ok).toBe(true);
  });

  it("egen: kollegans bokning → forbidden, inget ändras", async () => {
    const id = await booking("matias");
    const r = await moveBooking(
      { bookingId: id, newStart: iso(at(TUE, "17:30")) },
      ctx("diego"),
    );
    expect(r).toEqual({ ok: false, error: "forbidden" });
  });

  it("egen: kan inte flytta sin egen bokning till en kollega", async () => {
    const id = await booking("diego");
    const r = await moveBooking(
      {
        bookingId: id,
        newStart: iso(at(TUE, "18:00")),
        newStaffId: biz.staff.matias!,
      },
      ctx("diego"),
    );
    expect(r).toEqual({ ok: false, error: "forbidden" });
  });

  it("alla: flyttar en kollegas bokning", async () => {
    const id = await booking("matias");
    const r = await moveBooking(
      { bookingId: id, newStart: iso(at(TUE, "18:30")) },
      ctx("tomas"),
    );
    expect(r.ok).toBe(true);
  });

  it("skapa: egen kan inte boka åt en kollega; alla kan", async () => {
    const req = (staffKey: string, time: string) => ({
      serviceId: biz.services.corte!,
      staffId: biz.staff[staffKey]!,
      start: iso(at("2026-10-07", time)),
      customer: { phone: "+56971234567", name: "Cliente" },
    });
    expect(await createBooking(req("matias", "11:00"), ctx("diego"))).toEqual({
      ok: false,
      error: "forbidden",
    });
    const ok = await createBooking(req("diego", "11:00"), ctx("tomas"));
    expect(ok.ok).toBe(true);
  });

  it("markera ankomst: kollegans bokning → forbidden", async () => {
    const id = await booking("matias");
    expect(await markArrival(users.diego!, biz.id, id, "completed")).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(await statusOf(id)).toBe("confirmed");
  });
});

describe("avboka, bekräfta och neka", () => {
  it("avboka en bekräftad egen bokning kräver can_cancel_bookings", async () => {
    const own = await booking("diego");
    expect(await cancelBooking({ bookingId: own }, ctx("diego"))).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(await statusOf(own)).toBe("confirmed");

    const withFlag = await booking("matias");
    const r = await cancelBooking({ bookingId: withFlag }, ctx("matias"));
    expect(r.ok).toBe(true);
    expect(await statusOf(withFlag)).toBe("cancelled");
  });

  it("neka en egen förfrågan kräver inte can_cancel_bookings", async () => {
    const id = await booking("diego", "requested");
    const r = await declineBooking({ bookingId: id }, ctx("diego"));
    expect(r.ok).toBe(true);
    expect(await statusOf(id)).toBe("cancelled");
  });

  it("bekräfta en kollegas förfrågan → forbidden; alla → ok", async () => {
    const id = await booking("matias", "requested");
    expect(await confirmBooking({ bookingId: id }, ctx("diego"))).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(await statusOf(id)).toBe("requested");
    const r = await confirmBooking({ bookingId: id }, ctx("tomas"));
    expect(r.ok).toBe(true);
    expect(await statusOf(id)).toBe("confirmed");
  });

  it("förfrågningslistan visar bara det medlemmen får hantera", async () => {
    const mine = await booking("diego", "requested");
    const theirs = await booking("matias", "requested");
    const forDiego = (await listPendingRequests(users.diego!, biz.id, NOW)).map(
      (x) => x.id,
    );
    expect(forDiego).toContain(mine);
    expect(forDiego).not.toContain(theirs);
    const forTomas = (await listPendingRequests(users.tomas!, biz.id, NOW)).map(
      (x) => x.id,
    );
    expect(forTomas).toEqual(expect.arrayContaining([mine, theirs]));
  });
});

describe("katalog och inställningar", () => {
  const service = {
    name: "Tintura",
    durationMin: "60",
    priceClp: "25000",
    bufferAfterMin: 0,
  };
  const week = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
    weekday,
    open: weekday <= 6,
    start: "10:00",
    end: "19:00",
  }));

  it("katalog: utan can_edit_catalog → forbidden, med → ok", async () => {
    expect(await createService(users.diego!, biz.id, service)).toEqual({
      ok: false,
      code: "forbidden",
    });
    const r = await createService(users.ana!, biz.id, service);
    expect(r.ok).toBe(true);
  });

  it("öppettider: utan can_edit_settings → forbidden, med → ok", async () => {
    expect(await replaceBusinessHours(users.diego!, biz.id, week)).toEqual({
      ok: false,
      code: "forbidden",
    });
    expect(await replaceBusinessHours(users.ana!, biz.id, week)).toEqual({
      ok: true,
    });
  });

  it("Inicio: intäkter kräver can_view_reports; member skickas med för UI:t", async () => {
    await booking("diego");
    const owner = { name: "x", firstName: "x" };
    const forStaff = await loadOwnerInicio(
      users.diego!,
      biz.id,
      TUE,
      NOW,
      owner,
    );
    expect(forStaff.stats.revenueWeekClp).toBe(0);
    expect(forStaff.member.perms.can_view_reports).toBe(false);
    const forOwner = await loadOwnerInicio(
      biz.ownerUserId,
      biz.id,
      TUE,
      NOW,
      owner,
    );
    expect(forOwner.stats.revenueWeekClp).toBeGreaterThan(0);
    expect(forOwner.member.role).toBe("owner");
  });
});

describe("export och radering: bara ägaren", () => {
  it("personal (även med alla andra flaggor) → forbidden; ägaren → ok", async () => {
    expect(await exportCustomer(users.tomas!, biz.id, biz.customerId)).toEqual({
      ok: false,
      code: "forbidden",
    });
    expect(await exportBusiness(users.ana!, biz.id)).toEqual({
      ok: false,
      code: "forbidden",
    });
    const r = await exportCustomer(biz.ownerUserId, biz.id, biz.customerId);
    expect(r.ok).toBe(true);
  });
});
