import { afterEach, describe, expect, it } from "vitest";

import { SANTIAGO, type LocalDate, type LocalTime } from "@/lib/format/dates";
import type { E164 } from "@/lib/format/phone";

import type {
  AgendaBooking,
  AgendaBusinessHours,
  MonthDayCounts,
} from "./types";
import {
  isMonthDayClosed,
  monthCellAria,
  monthCountsFromBookings,
  monthTitle,
  monthWeeks,
  summarizeMonthCounts,
} from "./month-view";

describe("monthWeeks", () => {
  it("oktober 2026 börjar på måndagen 28 sep (utfyllnad från föregående månad)", () => {
    const weeks = monthWeeks({ year: 2026, month: 10 });
    expect(weeks[0]?.[0]).toEqual({
      date: "2026-09-28",
      day: 28,
      inMonth: false,
    });
    // Varje vecka börjar på en måndag och slutar på en söndag — kontrollera
    // hela rutnätet, inte bara första cellen.
    for (const week of weeks) {
      expect(week).toHaveLength(7);
      expect(new Date(`${week[0]?.date}T00:00:00Z`).getUTCDay()).toBe(1);
      expect(new Date(`${week[6]?.date}T00:00:00Z`).getUTCDay()).toBe(0);
    }
  });

  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("september 2026 (sommartidsbyte i Chile mitt i månaden) ger 30 unika dagar oavsett process.env.TZ", () => {
    for (const tz of ["UTC", "America/Santiago", "Europe/Madrid"]) {
      process.env.TZ = tz;
      const cells = monthWeeks({ year: 2026, month: 9 })
        .flat()
        .filter((c) => c.inMonth);
      expect(cells).toHaveLength(30);
      expect(new Set(cells.map((c) => c.date)).size).toBe(30);
    }
  });
});

describe("monthTitle", () => {
  it('"Octubre 2026"', () => {
    expect(monthTitle({ year: 2026, month: 10 })).toBe("Octubre 2026");
  });
});

describe("isMonthDayClosed", () => {
  const hours: AgendaBusinessHours = {
    1: [{ open: "09:00" as LocalTime, close: "18:00" as LocalTime }],
    // söndag (7) saknar nyckel = stängt.
  };

  it("stängt en dag utan öppettidsintervall", () => {
    expect(isMonthDayClosed("2026-10-04" as LocalDate, hours)).toBe(true); // söndag
  });

  it("öppet en dag med öppettidsintervall", () => {
    expect(isMonthDayClosed("2026-09-28" as LocalDate, hours)).toBe(false); // måndag
  });
});

/** `LocalDate` är en märkt sträng (branded type) — de här hjälparna är bara TS-koserien
 * för testdata, ingen egen logik. */
function d(s: string): LocalDate {
  return s as LocalDate;
}

function monthDayCounts(
  rec: Record<string, Record<string, number>>,
): MonthDayCounts {
  return rec as MonthDayCounts;
}

function booking(staffId: string, date: string): AgendaBooking {
  return {
    id: `${staffId}-${date}`,
    staffId,
    start: `${date}T11:30:00-03:00`,
    end: `${date}T12:00:00-03:00`,
    clientName: "Cliente",
    phone: "+56912344821" as E164,
    visitNumber: 1,
    service: "Corte",
    priceClp: 8_000,
    depositPaidClp: null,
    source: "web",
    status: "confirmed",
    confirmedByCustomer: false,
  };
}

describe("monthCountsFromBookings", () => {
  it("räknar bara bokningar i den efterfrågade månaden, per profesional", () => {
    const counts = monthCountsFromBookings(
      [
        booking("staff-1", "2026-10-02"),
        booking("staff-1", "2026-10-02"),
        booking("staff-2", "2026-10-15"),
        booking("staff-1", "2026-09-30"), // annan månad, ska inte räknas
      ],
      { year: 2026, month: 10 },
      SANTIAGO,
    );
    expect(counts[d("2026-10-02")]).toEqual({ "staff-1": 2 });
    expect(counts[d("2026-10-15")]).toEqual({ "staff-2": 1 });
    expect(counts[d("2026-09-30")]).toBeUndefined();
  });

  it("grupperar via den lokala dagen (tidszon), inte en textjämförelse av instant-strängen", () => {
    // 2026-10-01T02:00:00Z = 2026-09-30T23:00:00-03:00 i Santiago — hör alltså till
    // september, inte oktober (samma bugg som localDateOf skyddar mot i agenda-view.ts).
    const counts = monthCountsFromBookings(
      [
        {
          ...booking("staff-1", "2026-10-01"),
          start: "2026-10-01T02:00:00+00:00",
          end: "2026-10-01T02:30:00+00:00",
        },
      ],
      { year: 2026, month: 9 },
      SANTIAGO,
    );
    expect(counts[d("2026-09-30")]).toEqual({ "staff-1": 1 });
    expect(counts[d("2026-10-01")]).toBeUndefined();
  });
});

describe("summarizeMonthCounts", () => {
  it("summerar totalt och samlar distinkta profesionalfärger", () => {
    const staffColorById = new Map<string, 1 | 2 | 3 | 4 | 5 | 6>([
      ["staff-1", 1],
      ["staff-2", 2],
    ]);
    const summary = summarizeMonthCounts(
      monthDayCounts({
        "2026-10-02": { "staff-1": 2, "staff-2": 1 },
        "2026-10-03": { "staff-1": 1 },
      }),
      staffColorById,
    );
    expect(summary.get(d("2026-10-02"))).toEqual({
      count: 3,
      staffColors: [1, 2],
    });
    expect(summary.get(d("2026-10-03"))).toEqual({
      count: 1,
      staffColors: [1],
    });
  });

  it("dagar utan bokningar (totalt 0) hamnar inte i kartan", () => {
    const summary = summarizeMonthCounts(
      monthDayCounts({ "2026-10-02": { "staff-1": 0 } }),
      new Map(),
    );
    expect(summary.has("2026-10-02" as LocalDate)).toBe(false);
  });
});

describe("monthCellAria", () => {
  it("stängd dag", () => {
    expect(monthCellAria("2026-10-04" as LocalDate, true, 0)).toBe(
      "Domingo 4 de octubre, cerrado",
    );
  });

  it("dag utan bokningar", () => {
    expect(monthCellAria("2026-10-05" as LocalDate, false, 0)).toBe(
      "Lunes 5 de octubre, sin reservas",
    );
  });

  it("dag med en bokning (singular)", () => {
    expect(monthCellAria("2026-10-05" as LocalDate, false, 1)).toBe(
      "Lunes 5 de octubre, 1 reserva",
    );
  });

  it("dag med flera bokningar (plural)", () => {
    expect(monthCellAria("2026-10-05" as LocalDate, false, 3)).toBe(
      "Lunes 5 de octubre, 3 reservas",
    );
  });
});
