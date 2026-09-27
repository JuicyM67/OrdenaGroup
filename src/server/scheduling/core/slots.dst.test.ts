import { describe, expect, it } from "vitest";

import { eachLocalDate, isoWeekdayOf } from "@/lib/format/dates";

import { d, DIEGO, late, norte, nowAt, staff } from "../__fixtures__/snapshot";
import type { DayInput, ScheduleSnapshot } from "../types";
import { dayStatus, slotsForDay } from "./slots";

const EARLY = nowAt("2026-01-01", "09:00");

function input(
  snapshot: ScheduleSnapshot,
  date: string,
  over: Partial<DayInput> = {},
): DayInput {
  return {
    snapshot,
    date: d(date),
    staff: DIEGO,
    audience: "owner",
    now: EARLY,
    ...over,
  };
}

describe("bokning som korsar sommartidsbytet", () => {
  // Öppet 22:00–24:00 lör 5 sep 2026 och 00:00–02:00 sön 6 sep (00:00 finns inte).
  const s = late({ service: { durationMin: 60, bufferAfterMin: 0 } });

  it("60 min som börjar 23:30 den 5:e ryms inte (fönstret slutar 24:00 = 04:00Z)", () => {
    const sat = slotsForDay(input(s, "2026-09-05"));
    expect(sat.map((x) => x.time)).toEqual([
      "22:00",
      "22:15",
      "22:30",
      "22:45",
      "23:00",
    ]);
    expect(sat[sat.length - 1]!.end).toBe("2026-09-06T04:00:00.000Z");
  });

  it("fönster slås aldrig ihop över midnatt: söndagen börjar 01:00 med 60 verkliga minuter", () => {
    const sun = slotsForDay(input(s, "2026-09-06"));
    expect(sun.map((x) => [x.time, x.start])).toEqual([
      ["01:00", "2026-09-06T04:00:00.000Z"],
    ]);
  });
});

describe("25-timmarsdagen (lör 4 apr 2026)", () => {
  it("22:00–24:00, 30 min, intervall 30 → sex tider med dubbla etiketter (policy 8)", () => {
    const s = late({
      service: { durationMin: 30, bufferAfterMin: 0 },
      slotIntervalMinutes: 30,
    });
    const slots = slotsForDay(input(s, "2026-04-04"));
    expect(slots.map((x) => x.time)).toEqual([
      "22:00",
      "22:30",
      "23:00",
      "23:30",
      "23:00",
      "23:30",
    ]);
    expect(slots.map((x) => x.start)).toEqual([
      "2026-04-05T01:00:00.000Z",
      "2026-04-05T01:30:00.000Z",
      "2026-04-05T02:00:00.000Z",
      "2026-04-05T02:30:00.000Z",
      "2026-04-05T03:00:00.000Z",
      "2026-04-05T03:30:00.000Z",
    ]);
  });
});

describe("23-timmarsdagen (sön 6 sep 2026)", () => {
  it("första tiden har etiketten 01:00", () => {
    const s = late({ service: { durationMin: 30, bufferAfterMin: 0 } });
    expect(slotsForDay(input(s, "2026-09-06"))[0]!.time).toBe("01:00");
  });

  it("2027: sön 5 sep börjar också 01:00", () => {
    const s = late({ service: { durationMin: 30, bufferAfterMin: 0 } });
    expect(slotsForDay(input(s, "2027-09-05"))[0]!.start).toBe(
      "2027-09-05T04:00:00.000Z",
    );
  });
});

describe("dagstatus över veckor med sommartidsbyte", () => {
  it.each([
    ["2026-08-31", "2026-09-06"],
    ["2026-03-30", "2026-04-05"],
    ["2027-03-29", "2027-04-04"],
    ["2027-08-30", "2027-09-05"],
  ])("%s–%s: rätt veckodag och status, inga dagar hoppas över", (from, to) => {
    const s = norte({ staff: [staff(DIEGO, 1)] });
    const dates = eachLocalDate(d(from), d(to));
    expect(dates).toHaveLength(7);
    expect(new Set(dates).size).toBe(7);
    expect(dates.map((x) => isoWeekdayOf(x))).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(dates.map((x) => dayStatus(input(s, x)))).toEqual([
      "available",
      "available",
      "available",
      "available",
      "available",
      "available",
      "closed",
    ]);
  });
});
