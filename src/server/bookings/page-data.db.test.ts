import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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
  insertTestTimeOff,
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

describe("loadReservaPageData · profil (WP-41)", () => {
  it("returnerar profilfälten, galleriet i ordning, beskrivning och roll", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
    const b = await createTestBusiness();
    try {
      await adminQuery(
        `update public.businesses
            set about = 'Salón en Providencia', instagram = 'salon.nova',
                address = 'Av. Providencia 1234', phone = '+56912345678',
                cover_url = 'https://proj.supabase.co/storage/v1/object/public/business-media/' || $1::text || '/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg'
          where id = $1`,
        [b.id],
      );
      await adminQuery(
        `insert into public.business_images (business_id, path, sort)
         values ($1::uuid, $1::text || '/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png', 2), ($1::uuid, $1::text || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg', 1),
                ($1::uuid, $1::text || '/../annan/x.jpg', 3)`,
        [b.id],
      );
      await adminQuery(
        "update public.services set description = 'Con lavado' where id = $1",
        [b.services.corte],
      );
      await adminQuery(
        "update public.staff set title = 'Barbero' where id = $1",
        [b.staff.diego],
      );

      const data = await load(b);
      const p = data!.profile!;
      expect(p.about).toBe("Salón en Providencia");
      expect(p.instagram).toBe("salon.nova");
      expect(p.address).toBe("Av. Providencia 1234");
      expect(p.phone).toBe("+56912345678");
      expect(p.coverUrl).toBe(
        `https://proj.supabase.co/storage/v1/object/public/business-media/${b.id}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg`,
      );
      expect(p.logoUrl).toBeNull();
      expect(p.gallery).toEqual([
        `https://proj.supabase.co/storage/v1/object/public/business-media/${b.id}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`,
        `https://proj.supabase.co/storage/v1/object/public/business-media/${b.id}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png`,
      ]);
      expect(p.hours).toHaveLength(6);
      expect(p.hours[0]).toEqual({ weekday: 1, start: "10:00", end: "19:00" });

      const corte = data!.services.find((s) => s.id === b.services.corte);
      expect(corte!.description).toBe("Con lavado");
      expect(
        data!.services.find((s) => s.id === b.services.barba)!.description,
      ).toBeNull();
      expect(data!.staff.find((s) => s.id === b.staff.diego)!.title).toBe(
        "Barbero",
      );
    } finally {
      vi.unstubAllEnvs();
      await dropTestBusiness(b);
    }
  });

  it("öppet nu: stängt före öppning, öppet till 19:00, stängning för hela företaget räknas", async () => {
    // Torsdag 2026-10-01, mån–lör 10:00–19:00, min_notice 60.
    expect((await load(biz))!.profile!.openNow).toEqual({ open: false });
    const noon = new Date(at("2026-10-01", "12:00"));
    expect((await load(biz, noon))!.profile!.openNow).toEqual({
      open: true,
      closesAt: "19:00",
    });
    // Söndag: stängt.
    const sunday = new Date(at("2026-10-04", "12:00"));
    expect((await load(biz, sunday))!.profile!.openNow).toEqual({
      open: false,
    });

    const b = await createTestBusiness();
    try {
      await insertTestTimeOff(b, {
        start: at("2026-10-01", "13:00"),
        end: at("2026-10-01", "14:00"),
        kind: "lunch",
      });
      // Personalens frånvaro påverkar inte "öppet".
      await insertTestTimeOff(b, {
        start: at("2026-10-01", "10:00"),
        end: at("2026-10-01", "19:00"),
        staffKey: "diego",
      });
      expect((await load(b, noon))!.profile!.openNow).toEqual({
        open: true,
        closesAt: "13:00",
      });
      const lunch = new Date(at("2026-10-01", "13:30"));
      expect((await load(b, lunch))!.profile!.openNow).toEqual({ open: false });
    } finally {
      await dropTestBusiness(b);
    }
  });

  it("nästa lediga tid: första tiden framåt för någon tjänst och personal", async () => {
    // 09:00 med 60 min framförhållning → 10:00 samma dag.
    const next = (await load(biz))!.profile!.nextAvailable;
    expect(next).not.toBeNull();
    expect(next!.start).toBe(new Date(at("2026-10-01", "10:00")).toISOString());
    expect(Object.values(biz.services)).toContain(next!.serviceId);

    // Lördag 18:30: inget kvar idag, söndag stängt → måndag 10:00.
    const late = new Date(at("2026-10-03", "18:30"));
    expect((await load(biz, late))!.profile!.nextAvailable!.start).toBe(
      new Date(at("2026-10-05", "10:00")).toISOString(),
    );
  });

  it("nästa lediga tid är null utan tjänster eller för ett fruset företag", async () => {
    expect((await load(noServices))!.profile!.nextAvailable).toBeNull();
    const f = (await load(frozen))!.profile!;
    expect(f.nextAvailable).toBeNull();
    expect(f.gallery).toEqual([]);
  });
});
