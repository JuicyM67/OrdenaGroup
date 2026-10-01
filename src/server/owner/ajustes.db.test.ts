import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  dropTestBusiness,
  type TestBusiness,
} from "@/server/db/testing";

import {
  createService,
  createStaff,
  loadAjustesData,
  replaceBusinessHours,
  setServiceActive,
  setStaffActive,
  updateBusinessSettings,
  updateService,
  updateStaff,
} from "./ajustes";

let biz: TestBusiness;
let other: TestBusiness;

const RULES = {
  name: "Barbería Test",
  slug: "",
  comuna: "Providencia",
  phone: "+56912345678",
  address: "",
  minNoticeMinutes: 60,
  maxDaysAhead: 30,
  cancelWindowHours: 3,
  autoConfirmBookings: false,
  cancelApproval: "none",
  slotIntervalMinutes: 15,
};

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

describe("updateBusinessSettings", () => {
  it("sparar ändringar (F1, Ajustes)", async () => {
    const result = await updateBusinessSettings(biz.ownerUserId, biz.id, {
      ...RULES,
      slug: biz.slug,
      name: "Barbería Norte Actualizada",
      comuna: "Ñuñoa",
      address: "Av. Siempre Viva 123",
      cancelWindowHours: 6,
    });
    expect(result).toEqual({ ok: true });

    const row = await adminQuery<{
      name: string;
      comuna: string;
      address: string;
      cancel_window_hours: number;
    }>(
      "select name, comuna, address, cancel_window_hours from public.businesses where id = $1",
      [biz.id],
    );
    expect(row.rows[0]).toEqual({
      name: "Barbería Norte Actualizada",
      comuna: "Ñuñoa",
      address: "Av. Siempre Viva 123",
      cancel_window_hours: 6,
    });
  });

  it("ogiltig indata (zod) → inget skrivs", async () => {
    const before = await adminQuery<{ name: string }>(
      "select name from public.businesses where id = $1",
      [biz.id],
    );
    const result = await updateBusinessSettings(biz.ownerUserId, biz.id, {
      ...RULES,
      slug: biz.slug,
      name: "",
    });
    expect(result).toEqual({ ok: false, code: "business.name_empty" });
    const after = await adminQuery<{ name: string }>(
      "select name from public.businesses where id = $1",
      [biz.id],
    );
    expect(after.rows[0]).toEqual(before.rows[0]);
  });

  it("en annan ägare kan inte ändra företaget (tenant-isolering)", async () => {
    const before = await adminQuery<{ name: string }>(
      "select name from public.businesses where id = $1",
      [biz.id],
    );
    const result = await updateBusinessSettings(other.ownerUserId, biz.id, {
      ...RULES,
      slug: biz.slug,
      name: "Hackeado",
    });
    expect(result).toEqual({ ok: false, code: "unauthorized" });
    const after = await adminQuery<{ name: string }>(
      "select name from public.businesses where id = $1",
      [biz.id],
    );
    expect(after.rows[0]).toEqual(before.rows[0]);
  });
});

describe("loadAjustesData", () => {
  it("läser företag, tjänster, personal och öppettider", async () => {
    const data = await loadAjustesData(biz.ownerUserId, biz.id);
    expect(data.business.comuna).toBe("Ñuñoa");
    expect(data.services.length).toBeGreaterThan(0);
    expect(data.staff.length).toBeGreaterThan(0);
    expect(data.hours.filter((h) => h.open)).toHaveLength(6);
  });
});

describe("services", () => {
  it("lägger till, ändrar och inaktiverar/aktiverar en tjänst", async () => {
    const created = await createService(biz.ownerUserId, biz.id, {
      name: "Tinte",
      durationMin: "45",
      priceClp: "25000",
      bufferAfterMin: 5,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updated = await updateService(biz.ownerUserId, biz.id, created.id, {
      name: "Tinte premium",
      durationMin: "60",
      priceClp: "30000",
      bufferAfterMin: 10,
    });
    expect(updated).toEqual({ ok: true });

    const row = await adminQuery<{
      name: string;
      duration_min: number;
      active: boolean;
    }>("select name, duration_min, active from public.services where id = $1", [
      created.id,
    ]);
    expect(row.rows[0]).toEqual({
      name: "Tinte premium",
      duration_min: 60,
      active: true,
    });

    const deactivated = await setServiceActive(
      biz.ownerUserId,
      biz.id,
      created.id,
      false,
    );
    expect(deactivated).toEqual({ ok: true });
    const afterDeactivate = await adminQuery<{ active: boolean }>(
      "select active from public.services where id = $1",
      [created.id],
    );
    expect(afterDeactivate.rows[0]?.active).toBe(false);
  });

  it("en annan ägare kan inte skapa eller ändra tjänster i det här företaget (tenant-isolering)", async () => {
    const created = await createService(other.ownerUserId, biz.id, {
      name: "Intruso",
      durationMin: "30",
      priceClp: "10000",
      bufferAfterMin: 0,
    });
    expect(created).toEqual({ ok: false, code: "unauthorized" });

    const anyService = Object.values(biz.services)[0]!;
    const updated = await updateService(other.ownerUserId, biz.id, anyService, {
      name: "Hackeado",
      durationMin: "30",
      priceClp: "10000",
      bufferAfterMin: 0,
    });
    expect(updated).toEqual({ ok: false, code: "unauthorized" });

    const row = await adminQuery<{ name: string }>(
      "select name from public.services where id = $1",
      [anyService],
    );
    expect(row.rows[0]?.name).not.toBe("Hackeado");
  });
});

describe("staff", () => {
  it("lägger till, ändrar (namn och tjänster) och inaktiverar/aktiverar en profesional", async () => {
    const serviceId = Object.values(biz.services)[0]!;
    const created = await createStaff(biz.ownerUserId, biz.id, {
      name: "Nueva Persona",
      serviceIds: [serviceId],
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const linked = await adminQuery<{ n: string }>(
      "select count(*)::text as n from public.staff_services where staff_id = $1",
      [created.id],
    );
    expect(linked.rows[0]?.n).toBe("1");

    const updated = await updateStaff(biz.ownerUserId, biz.id, created.id, {
      name: "Persona Actualizada",
      serviceIds: [],
    });
    expect(updated).toEqual({ ok: true });

    const row = await adminQuery<{ name: string; active: boolean }>(
      "select name, active from public.staff where id = $1",
      [created.id],
    );
    expect(row.rows[0]).toEqual({ name: "Persona Actualizada", active: true });
    const linkedAfter = await adminQuery<{ n: string }>(
      "select count(*)::text as n from public.staff_services where staff_id = $1",
      [created.id],
    );
    expect(linkedAfter.rows[0]?.n).toBe("0");

    const deactivated = await setStaffActive(
      biz.ownerUserId,
      biz.id,
      created.id,
      false,
    );
    expect(deactivated).toEqual({ ok: true });
    const afterDeactivate = await adminQuery<{ active: boolean }>(
      "select active from public.staff where id = $1",
      [created.id],
    );
    expect(afterDeactivate.rows[0]?.active).toBe(false);
  });

  it("en annan ägare kan inte skapa eller ändra personal i det här företaget (tenant-isolering)", async () => {
    const created = await createStaff(other.ownerUserId, biz.id, {
      name: "Intruso",
      serviceIds: [],
    });
    expect(created).toEqual({ ok: false, code: "unauthorized" });

    const anyStaff = Object.values(biz.staff)[0]!;
    const updated = await updateStaff(other.ownerUserId, biz.id, anyStaff, {
      name: "Hackeado",
      serviceIds: [],
    });
    expect(updated).toEqual({ ok: false, code: "unauthorized" });

    const row = await adminQuery<{ name: string }>(
      "select name from public.staff where id = $1",
      [anyStaff],
    );
    expect(row.rows[0]?.name).not.toBe("Hackeado");
  });
});

describe("replaceBusinessHours", () => {
  it("byter ut hela veckans öppettider (samma form som onboarding)", async () => {
    const result = await replaceBusinessHours(biz.ownerUserId, biz.id, [
      { weekday: 1, open: true, start: "08:00", end: "13:00" },
      { weekday: 2, open: false },
      { weekday: 3, open: true, start: "09:00", end: "18:00" },
      { weekday: 4, open: false },
      { weekday: 5, open: false },
      { weekday: 6, open: false },
      { weekday: 7, open: false },
    ]);
    expect(result).toEqual({ ok: true });

    const rows = await adminQuery<{ weekday: number }>(
      "select weekday from public.business_hours where business_id = $1 order by weekday",
      [biz.id],
    );
    expect(rows.rows.map((r) => r.weekday)).toEqual([1, 3]);
  });

  it("start efter slut → hours.business_hours_start_before_end, inget skrivs", async () => {
    const before = await adminQuery<{ n: string }>(
      "select count(*)::text as n from public.business_hours where business_id = $1",
      [biz.id],
    );
    const result = await replaceBusinessHours(biz.ownerUserId, biz.id, [
      { weekday: 1, open: true, start: "20:00", end: "10:00" },
    ]);
    expect(result).toEqual({
      ok: false,
      code: "hours.business_hours_start_before_end",
    });
    const after = await adminQuery<{ n: string }>(
      "select count(*)::text as n from public.business_hours where business_id = $1",
      [biz.id],
    );
    expect(after.rows[0]?.n).toBe(before.rows[0]?.n);
  });

  it("en annan ägare kan inte ändra öppettiderna (tenant-isolering)", async () => {
    const before = await adminQuery<{ n: string }>(
      "select count(*)::text as n from public.business_hours where business_id = $1",
      [biz.id],
    );
    const result = await replaceBusinessHours(other.ownerUserId, biz.id, [
      { weekday: 1, open: true, start: "00:00", end: "01:00" },
    ]);
    expect(result).toEqual({ ok: false, code: "unauthorized" });
    const after = await adminQuery<{ n: string }>(
      "select count(*)::text as n from public.business_hours where business_id = $1",
      [biz.id],
    );
    expect(after.rows[0]?.n).toBe(before.rows[0]?.n);
  });
});
