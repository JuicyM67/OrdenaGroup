import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

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

import { loadOwnerInicio } from "./inicio";

/**
 * WP-47: statistiken i Inicio (F# — se `docs/tasks/BACKLOG.md`) som tidigare alltid var
 * nollor/tom lista. Ett företag per test (inte `beforeAll`/delat): flera av testerna
 * beror på `now` och 30/60-dagarsfönster, och ett delat företag skulle göra dem känsliga
 * för varandras data.
 */
const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();

const DAY_MS = 24 * 60 * 60 * 1000;

// Tisdag i en vecka (måndag 2026-10-05 – söndag 2026-10-11), samma vecka som
// `load.db.test.ts` använder för Agenda.
const TUE = "2026-10-06" as LocalDate;

let biz: TestBusiness | undefined;

beforeAll(() => {
  assertLocalDatabase();
});

afterEach(async () => {
  if (biz) await dropTestBusiness(biz);
  biz = undefined;
});

describe("loadOwnerInicio — stats.revenueWeekClp/revenueSeries", () => {
  it("summerar pris − rabatt för veckans bokningar, exkl. avbokade/uteblivna; per veckodag i revenueSeries", async () => {
    biz = await createTestBusiness();
    const now = new Date(at(TUE, "09:00"));

    // Måndag (index 0): räknas.
    await insertTestBooking(biz, {
      start: at("2026-10-05", "10:00"),
      durationMin: 35,
    });
    // Onsdag (index 2): två bokningar räknas, en avbokad och en uteblivet räknas inte.
    await insertTestBooking(biz, {
      start: at("2026-10-07", "10:00"),
      durationMin: 35,
    });
    await insertTestBooking(biz, {
      start: at("2026-10-07", "13:00"),
      durationMin: 35,
    });
    await insertTestBooking(biz, {
      start: at("2026-10-07", "15:00"),
      durationMin: 35,
      status: "cancelled",
    });
    await insertTestBooking(biz, {
      start: at("2026-10-07", "16:00"),
      durationMin: 35,
      status: "no_show",
    });
    // Nästa vecka: räknas inte.
    await insertTestBooking(biz, {
      start: at("2026-10-12", "10:00"),
      durationMin: 35,
    });

    const data = await loadOwnerInicio(biz.ownerUserId, biz.id, TUE, now, {
      name: "Camila",
      firstName: "Camila",
    });

    expect(data.stats.revenueWeekClp).toBe(30_000);
    expect(data.stats.revenueSeries).toEqual([10_000, 0, 20_000, 0, 0, 0, 0]);
  });
});

describe("loadOwnerInicio — stats.noShowPct/noShowTrend", () => {
  it("räknar uteblivanden senaste 30 dagarna, jämfört med de föregående 30 (down = färre)", async () => {
    biz = await createTestBusiness();
    const now = new Date(at(TUE, "12:00"));

    // Senaste 30 dagarna: 1 av 4 uteblivet → 25 %.
    await insertTestBooking(biz, {
      start: now.getTime() - 5 * DAY_MS,
      durationMin: 35,
      status: "no_show",
    });
    await insertTestBooking(biz, {
      start: now.getTime() - 10 * DAY_MS,
      durationMin: 35,
      status: "completed",
    });
    await insertTestBooking(biz, {
      start: now.getTime() - 15 * DAY_MS,
      durationMin: 35,
      status: "completed",
    });
    await insertTestBooking(biz, {
      start: now.getTime() - 20 * DAY_MS,
      durationMin: 35,
      status: "completed",
    });

    // Föregående 30 dagarna (31–60 dagar sedan): 2 av 4 uteblivet → 50 % (fler → trend "up").
    for (let i = 0; i < 2; i++) {
      await insertTestBooking(biz, {
        start: now.getTime() - (35 + i) * DAY_MS,
        durationMin: 35,
        status: "no_show",
      });
    }
    for (let i = 0; i < 2; i++) {
      await insertTestBooking(biz, {
        start: now.getTime() - (45 + i) * DAY_MS,
        durationMin: 35,
        status: "completed",
      });
    }

    const data = await loadOwnerInicio(biz.ownerUserId, biz.id, TUE, now, {
      name: "Camila",
      firstName: "Camila",
    });

    expect(data.stats.noShowPct).toBe(25);
    expect(data.stats.noShowTrend).toBe("down");
  });

  it("ingen historik alls → 0 % och trend flat (inget att jämföra med)", async () => {
    biz = await createTestBusiness();
    const now = new Date(at(TUE, "12:00"));

    const data = await loadOwnerInicio(biz.ownerUserId, biz.id, TUE, now, {
      name: "Camila",
      firstName: "Camila",
    });

    expect(data.stats.noShowPct).toBe(0);
    expect(data.stats.noShowTrend).toBe("flat");
  });
});

describe("loadOwnerInicio — calendar.markedDates", () => {
  it("en dag per datum med minst en icke-avbokad bokning i månaden, inga dubbletter", async () => {
    biz = await createTestBusiness();
    const now = new Date(at(TUE, "09:00"));

    // Två bokningar samma dag → en enda post i markedDates.
    await insertTestBooking(biz, {
      start: at("2026-10-06", "10:00"),
      durationMin: 35,
    });
    await insertTestBooking(biz, {
      start: at("2026-10-06", "13:00"),
      durationMin: 35,
    });
    await insertTestBooking(biz, {
      start: at("2026-10-20", "10:00"),
      durationMin: 35,
    });
    // Avbokad: räknas inte.
    await insertTestBooking(biz, {
      start: at("2026-10-15", "10:00"),
      durationMin: 35,
      status: "cancelled",
    });
    // Annan månad: räknas inte.
    await insertTestBooking(biz, {
      start: at("2026-11-02", "10:00"),
      durationMin: 35,
    });

    const data = await loadOwnerInicio(biz.ownerUserId, biz.id, TUE, now, {
      name: "Camila",
      firstName: "Camila",
    });

    expect(data.calendar.markedDates).toEqual(["2026-10-06", "2026-10-20"]);
  });
});

afterAll(async () => {
  await closePool();
});
