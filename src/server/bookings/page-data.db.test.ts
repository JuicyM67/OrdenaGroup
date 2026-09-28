import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  addLocalDays,
  fromLocal,
  SANTIAGO,
  toLocalDate,
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
import { withServiceTx } from "@/server/db/tx";

import { loadReservaPageData } from "./page-data";

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();
const NOW = new Date(at("2026-10-01", "09:00"));
const TODAY = toLocalDate(NOW, SANTIAGO);

let biz: TestBusiness;
let frozen: TestBusiness;
let noServices: TestBusiness;

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness();
  frozen = await createTestBusiness();
  await adminQuery(
    "update public.businesses set status = 'frozen' where id = $1",
    [frozen.id],
  );
  noServices = await createTestBusiness({ services: [] });
});

afterAll(async () => {
  for (const b of [biz, frozen, noServices]) await dropTestBusiness(b);
  await closePool();
});

function load(b: TestBusiness, now = NOW) {
  return withServiceTx((q) =>
    loadReservaPageData(q, { businessId: b.id, slug: b.slug, now }),
  );
}

describe("loadReservaPageData", () => {
  it("bygger företag, öppettider, tjänster och personal från de riktiga tabellerna", async () => {
    const data = await load(biz);
    expect(data).not.toBeNull();
    expect(data!.business.name).toBe("Barbería Test");
    expect(data!.business.comuna).toBe("Providencia");
    expect(data!.business.status).toBe("active");
    expect(data!.business.weekdaysOpen).toEqual([1, 2, 3, 4, 5, 6]);
    expect(data!.business.open).toBe("10:00");
    expect(data!.business.close).toBe("19:00");
    expect(data!.business.cancelWindowHours).toBe(3);

    expect(data!.services.map((s) => s.name)).toEqual([
      "Corte clásico",
      "Barba",
      "Corte + barba",
    ]);
    // Tint cyklas (ingen DB-kolumn): lilac, peach, lime, lilac, …
    expect(data!.services.map((s) => s.tint)).toEqual([
      "lilac",
      "peach",
      "lime",
    ]);
    expect(data!.staff.map((s) => s.name)).toEqual([
      "Diego",
      "Matías",
      "Tomás",
    ]);
  });

  it("tillgängligheten täcker any + var och en av de tre profesionalerna, 21 dagar", async () => {
    const data = await load(biz);
    const corteId = biz.services.corte!;
    const byStaff = data!.availability[corteId]!;
    expect(Object.keys(byStaff).sort()).toEqual(
      ["any", biz.staff.diego, biz.staff.matias, biz.staff.tomas].sort(),
    );

    const anyDays = byStaff.any!;
    // Bara "open"-dagar med minst en tid (full/closed utelämnas helt).
    for (const day of anyDays) {
      expect(day.state).toBe("open");
      expect(day.hasFlash).toBe(false);
      expect(day.slots.length).toBeGreaterThan(0);
      expect(day.slots.length).toBeLessThanOrEqual(12);
      for (const slot of day.slots) {
        expect(slot.id).toBe(slot.start);
      }
      expect(day.date >= TODAY).toBe(true);
      expect(day.date <= addLocalDays(TODAY, 20)).toBe(true);
    }
    // Ingen dag bortom 21-dagarsfönstret (även om max_days_ahead är 30).
    expect(anyDays.every((d) => d.date <= addLocalDays(TODAY, 20))).toBe(true);
  });

  it("en helt fullbokad dag utelämnas (som en stängd dag) — väntelistan syns aldrig", async () => {
    const solo = await createTestBusiness({
      hours: [{ weekday: 2, start: "10:00", end: "10:30" }],
      staff: [{ key: "diego" }],
      services: [{ key: "s30", durationMin: 30, priceClp: 5000 }],
      settings: { minNoticeMinutes: 0 },
    });
    try {
      // Tisdagen i samma vecka som NOW (2026-10-01 är en torsdag; nästa
      // tisdag är 2026-10-06) — hela det enda fönstret (10:00–10:30) upptas.
      const tue = at("2026-10-06", "10:00");
      await insertTestBooking(solo, {
        start: tue,
        durationMin: 30,
        staffKey: "diego",
        serviceKey: "s30",
      });
      const data = await load(solo);
      const days = data!.availability[solo.services.s30!]!.any!;
      expect(days.some((d) => d.date === "2026-10-06")).toBe(false);
    } finally {
      await dropTestBusiness(solo);
    }
  });

  it("frozen: företagsinfo laddas ändå, tjänster/personal/tillgänglighet tomma", async () => {
    const data = await load(frozen);
    expect(data!.business.status).toBe("frozen");
    expect(data!.business.name).toBe("Barbería Test");
    expect(data!.services).toEqual([]);
    expect(data!.staff).toEqual([]);
    expect(data!.availability).toEqual({});
  });

  it("inga tjänster: tom tillgänglighet utan att fråga motorn", async () => {
    const data = await load(noServices);
    expect(data!.services).toEqual([]);
    expect(data!.availability).toEqual({});
  });

  it("okänt businessId ger null", async () => {
    const data = await withServiceTx((q) =>
      loadReservaPageData(q, {
        businessId: "00000000-0000-0000-0000-000000000000",
        slug: "finns-inte",
        now: NOW,
      }),
    );
    expect(data).toBeNull();
  });
});
