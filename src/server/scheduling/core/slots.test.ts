import { describe, expect, it } from "vitest";

import { eachLocalDate, type LocalDate } from "@/lib/format/dates";

import {
  ALL_WEEK,
  at,
  BARBA,
  booking,
  CORTE_BARBA,
  d,
  DIEGO,
  hours,
  lunch,
  MATIAS,
  norte,
  nowAt,
  staff,
  TOMAS,
} from "../__fixtures__/snapshot";
import type { Audience, DayInput, ScheduleSnapshot } from "../types";
import {
  allSlotsForDay,
  candidateStarts,
  dayStatus,
  slotsForDay,
} from "./slots";

// Tisdag 6 okt 2026, sommartid (−03).
const TUE = "2026-10-06";
const EARLY = nowAt("2026-10-01", "09:00");

function input(
  snapshot: ScheduleSnapshot,
  over: Partial<DayInput> = {},
): DayInput {
  return {
    snapshot,
    date: d(TUE),
    staff: DIEGO,
    audience: "customer",
    now: EARLY,
    ...over,
  };
}

const times = (i: DayInput, limit?: number) =>
  slotsForDay(i, limit).map((s) => s.time);

function gridTimes(from: string, to: string, step: number): string[] {
  const out: string[] = [];
  const [fh, fm] = from.split(":").map(Number) as [number, number];
  const [th, tm] = to.split(":").map(Number) as [number, number];
  for (let m = fh * 60 + fm; m <= th * 60 + tm; m += step) {
    out.push(
      `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
    );
  }
  return out;
}

describe("candidateStarts", () => {
  it("rutnät från origo, bara starter där behovet ryms", () => {
    const origin = at(TUE, "10:00");
    const win = { start: at(TUE, "10:35"), end: at(TUE, "11:45") };
    expect(candidateStarts(win, origin, 15, 35 * 60_000)).toEqual([
      at(TUE, "10:35"),
      at(TUE, "10:45"),
      at(TUE, "11:00"),
    ]);
  });

  it("fönster som börjar mitt i en minut avrundas uppåt till hel minut", () => {
    const origin = at(TUE, "10:00");
    const win = { start: at(TUE, "14:30") + 30_000, end: at(TUE, "15:30") };
    expect(candidateStarts(win, origin, 15, 20 * 60_000)).toEqual([
      at(TUE, "14:31"),
      at(TUE, "14:45"),
      at(TUE, "15:00"),
    ]);
  });

  it("frånvaro som slutar 14:30:30 ger första tiden 14:31, aldrig sekunder", () => {
    const s = norte({
      timeOff: [
        {
          staffId: null,
          start: at(TUE, "13:30"),
          end: at(TUE, "14:30") + 30_000,
        },
      ],
    });
    const slots = slotsForDay(input(s, { audience: "owner" }));
    expect(slots.map((x) => x.time)).toContain("14:31");
    for (const x of slots) expect(Date.parse(x.start) % 60_000).toBe(0);
  });

  it("tomt när behovet inte ryms", () => {
    const win = { start: at(TUE, "10:00"), end: at(TUE, "10:30") };
    expect(candidateStarts(win, win.start, 15, 35 * 60_000)).toEqual([]);
  });
});

describe("rutnät", () => {
  it("10:00–19:00, intervall 15, 35 min: 10:00 … 18:15 (18:30 ryms inte)", () => {
    const all = times(input(norte(), { audience: "owner" }));
    expect(all).toEqual(gridTimes("10:00", "18:15", 15));
    expect(all).not.toContain("18:30");
  });

  it.each([5, 10, 20, 30, 60])("intervall %d linjerar från 10:00", (step) => {
    const all = times(
      input(norte({ slotIntervalMinutes: step }), { audience: "owner" }),
    );
    const last = 19 * 60 - 35;
    const lastOnGrid = 10 * 60 + Math.floor((last - 600) / step) * step;
    expect(all).toEqual(
      gridTimes(
        "10:00",
        `${String(Math.floor(lastOnGrid / 60)).padStart(2, "0")}:${String(lastOnGrid % 60).padStart(2, "0")}`,
        step,
      ),
    );
  });

  it("slotens end = start + duration (bufferten syns inte, inv. 4)", () => {
    const s = slotsForDay(
      input(norte({ service: CORTE_BARBA }), { audience: "owner" }),
    )[0]!;
    expect(s.time).toBe("10:00");
    expect(s.start).toBe("2026-10-06T13:00:00.000Z");
    expect(s.end).toBe("2026-10-06T13:50:00.000Z");
    expect(s.staffIds).toEqual([DIEGO]);
  });
});

describe("tight packing och buffert", () => {
  it("bokning 10:00–10:35 ger kandidaten 10:35 utöver 10:45", () => {
    const s = norte({ bookings: [booking(DIEGO, TUE, "10:00", 35)] });
    expect(times(input(s, { audience: "owner" })).slice(0, 3)).toEqual([
      "10:35",
      "10:45",
      "11:00",
    ]);
  });

  it("buffert: bokning 10:00 (35 + 10) → nästa start 10:45", () => {
    const s = norte({
      bookings: [booking(DIEGO, TUE, "10:00", 35, { bufferMin: 10 })],
    });
    expect(times(input(s, { audience: "owner" }))[0]).toBe("10:45");
  });

  it("behov inkl. buffert måste rymmas före lunch: 50 + 10 kan inte börja 12:45", () => {
    const s = norte({ service: CORTE_BARBA, timeOff: [lunch(TUE)] });
    const all = times(input(s, { audience: "owner" }));
    expect(all).toContain("12:30");
    expect(all).not.toContain("12:45");
    expect(all).not.toContain("13:00");
    expect(all).toContain("14:30");
  });

  it("behov inkl. buffert måste rymmas före stängning", () => {
    const s = norte({ service: CORTE_BARBA });
    const all = times(input(s, { audience: "owner" }));
    expect(all[all.length - 1]).toBe("18:00");
  });
});

describe("min_notice_minutes (inv. 5)", () => {
  it("customer: now 10:20, notice 60 → första tid 11:30 (rutnät), inte 11:20", () => {
    const i = input(norte(), { now: nowAt(TUE, "10:20") });
    expect(times(i, Infinity)[0]).toBe("11:30");
  });

  it("customer: exakt start = now + notice godtas", () => {
    const i = input(norte(), { now: nowAt(TUE, "10:30") });
    expect(times(i, Infinity)[0]).toBe("11:30");
  });

  it("owner: ingen notice, även passerade tider visas", () => {
    const i = input(norte(), { now: nowAt(TUE, "10:20"), audience: "owner" });
    expect(times(i)).toContain("10:00");
    expect(times(i)).toContain("10:30");
  });
});

describe("max_days_ahead (inv. 5)", () => {
  const s = norte({ businessHours: hours(ALL_WEEK, "10:00", "19:00") });
  // Fre 2 okt 2026 23:30 lokal tid = 2026-10-03T02:30Z.
  const now = nowAt("2026-10-02", "23:30");

  it("sista bokningsbara datum är 1 nov, inte 2 nov (lokala kalenderdagar)", () => {
    expect(now.toISOString()).toBe("2026-10-03T02:30:00.000Z");
    expect(dayStatus(input(s, { now, date: d("2026-11-01") }))).toBe(
      "available",
    );
    expect(dayStatus(input(s, { now, date: d("2026-11-02") }))).toBe("closed");
    expect(slotsForDay(input(s, { now, date: d("2026-11-02") }))).toEqual([]);
  });

  it("owner: ingen horisont", () => {
    expect(
      dayStatus(input(s, { now, date: d("2026-11-02"), audience: "owner" })),
    ).toBe("available");
  });
});

describe("gallring till limit (customer)", () => {
  const all = input(norte(), { audience: "customer" });

  it("tom dag med intervall 15 (34 kandidater) ger exakt 12, med första och sista bra kandidat", () => {
    expect(allSlotsForDay(all)).toHaveLength(34);
    const picked = times(all, 12);
    expect(picked).toHaveLength(12);
    expect(picked[0]).toBe("10:00");
    // 18:15 lämnar 10 min före stängning (< 20) och väljs bort; 18:00 lämnar 25.
    expect(picked[11]).toBe("18:00");
    expect([...picked].sort()).toEqual(picked);
  });

  it("är deterministisk", () => {
    expect(times(all, 12)).toEqual(times(all, 12));
  });

  it("jämnt fördelad: ingen lucka mellan valda tider över 75 min", () => {
    const starts = slotsForDay(all, 12).map((s) => Date.parse(s.start));
    const gaps = starts.slice(1).map((s, i) => (s - starts[i]!) / 60_000);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(75);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(30);
  });

  it("≤ limit kandidater returneras alla", () => {
    const s = norte({ slotIntervalMinutes: 60 });
    expect(times(input(s), 12)).toEqual(gridTimes("10:00", "18:00", 60));
  });

  it("utan limit (owner) returneras alla", () => {
    expect(times(input(norte(), { audience: "owner" }))).toHaveLength(34);
  });

  it("tider som lämnar en lucka kortare än kortaste tjänsten (20 min) väljs bort först", () => {
    const picked = slotsForDay(all, 12);
    const winStart = at(TUE, "10:00");
    const winEnd = at(TUE, "19:00");
    for (const p of picked) {
      const s = Date.parse(p.start);
      const before = (s - winStart) / 60_000;
      const after = (winEnd - (s + 35 * 60_000)) / 60_000;
      expect(before === 0 || before >= 20).toBe(true);
      expect(after === 0 || after >= 20).toBe(true);
    }
    // … men de finns kvar i den fullständiga mängden (createBooking godtar dem).
    const full = allSlotsForDay(all).map((c) => c.start);
    expect(full).toContain(at(TUE, "10:15"));
    expect(full).toContain(at(TUE, "18:15"));
  });

  it("fyller på med andra tider när de bra inte räcker", () => {
    // 10:00–13:00, 20 min, intervall 5 → 33 kandidater. Med kortaste tjänst
    // 60 min är bara 11 "bra" (offset 0, 60–100 och 160 min); alla 11 väljs
    // och en till fylls på.
    const s = norte({
      service: BARBA,
      slotIntervalMinutes: 5,
      shortestServiceMin: 60,
      businessHours: hours([2], "10:00", "13:00"),
    });
    const i = input(s);
    expect(allSlotsForDay(i)).toHaveLength(33);
    const picked = times(i, 12);
    expect(picked).toHaveLength(12);
    const good = ["10:00", ...gridTimes("11:00", "11:40", 5), "12:40"];
    expect(good).toHaveLength(11);
    for (const g of good) expect(picked).toContain(g);
  });
});

describe("dayStatus", () => {
  const status = (
    s: ScheduleSnapshot,
    date: string,
    over: Partial<DayInput> = {},
  ) => dayStatus(input(s, { date: d(date), ...over }));

  it("söndag (stängt) → closed", () => {
    expect(status(norte(), "2026-10-04")).toBe("closed");
  });

  it("all personal ledig hela dagen → closed", () => {
    const s = norte({
      staff: [staff(DIEGO, 1)],
      timeOff: [
        {
          staffId: DIEGO,
          start: at(TUE, "00:00"),
          end: at("2026-10-07", "00:00"),
        },
      ],
    });
    expect(status(s, TUE)).toBe("closed");
  });

  it("öppet men fullbokat → full", () => {
    const s = norte({
      staff: [staff(DIEGO, 1)],
      bookings: [booking(DIEGO, TUE, "10:00", 540)],
    });
    expect(status(s, TUE)).toBe("full");
  });

  it("bara passerade tider idag → full (customer)", () => {
    expect(status(norte(), TUE, { now: nowAt(TUE, "18:30") })).toBe("full");
  });

  it("före idag → closed (customer), available för owner", () => {
    expect(status(norte(), "2026-10-05", { now: nowAt(TUE, "09:00") })).toBe(
      "closed",
    );
    expect(
      status(norte(), "2026-10-05", {
        now: nowAt(TUE, "09:00"),
        audience: "owner",
      }),
    ).toBe("available");
  });

  it("minst en tid → available", () => {
    expect(status(norte(), TUE)).toBe("available");
  });
});

describe("Cualquiera (any)", () => {
  it("unionen: flera profesionales per tid, i tilldelningsordning", () => {
    const s = norte({
      service: { durationMin: 15, bufferAfterMin: 0 },
      businessHours: hours([2], "10:00", "10:30"),
      staff: [staff(DIEGO, 1), staff(MATIAS, 2)],
      bookings: [booking(DIEGO, TUE, "10:15", 15)],
    });
    const slots = slotsForDay(input(s, { staff: "any", audience: "owner" }));
    expect(slots.map((x) => [x.time, x.staffIds])).toEqual([
      ["10:00", [MATIAS, DIEGO]],
      ["10:15", [MATIAS]],
    ]);
  });

  it("inaktiv profesional eller utan staff_services är aldrig kandidat", () => {
    const s = norte({
      staff: [
        staff(DIEGO, 1, { active: false }),
        staff(MATIAS, 2, { offersService: false }),
        staff(TOMAS, 3),
      ],
    });
    const slots = slotsForDay(input(s, { staff: "any", audience: "owner" }));
    expect(new Set(slots.flatMap((x) => x.staffIds))).toEqual(new Set([TOMAS]));
    expect(slotsForDay(input(s, { staff: DIEGO, audience: "owner" }))).toEqual(
      [],
    );
    expect(slotsForDay(input(s, { staff: MATIAS, audience: "owner" }))).toEqual(
      [],
    );
  });
});

describe("prestanda (R10, loggas inte som krav)", () => {
  it("62 dagar × 6 profesionales", () => {
    const ids = Array.from({ length: 6 }, (_, i) => `s-${i}`);
    const s = norte({ staff: ids.map((id, i) => staff(id, i)) });
    const dates = eachLocalDate(d("2026-10-01"), d("2026-12-01"));
    const audience: Audience = "customer";
    const t0 = process.hrtime.bigint();
    for (const date of dates as LocalDate[]) {
      dayStatus({ snapshot: s, date, staff: "any", audience, now: EARLY });
    }
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    expect(dates).toHaveLength(62);
    expect(ms).toBeLessThan(2000);
  });
});
