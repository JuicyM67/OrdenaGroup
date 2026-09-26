import { describe, expect, it } from "vitest";

import {
  addLocalDays,
  eachLocalDate,
  isoWeekdayOf,
  minutesBetween,
  parseInstant,
  parseLocalDate,
  parseLocalTime,
  parseTimeZone,
  SANTIAGO,
  startOfLocalWeek,
  toLocalDate,
  toWallClock,
  utcOffsetMinutes,
  type LocalDate,
} from "./dates";

const d = (s: string) => s as LocalDate;
const utc = (s: string) => {
  const r = parseInstant(s);
  if (!r.ok) throw new Error(`fixture: ${s}`);
  return r.value;
};

describe("parseTimeZone", () => {
  it.each([
    "America/Santiago",
    "America/Punta_Arenas",
    "Pacific/Easter",
    "UTC",
  ])("%s ok", (tz) => {
    expect(parseTimeZone(tz)).toEqual({ ok: true, value: tz });
  });
  it.each([
    "",
    "Mars/Olympus",
    "America/Santiag",
    "+03:00",
    "-04:00",
    "GMT+3 x",
  ])("%j → invalid_time_zone", (tz) => {
    expect(parseTimeZone(tz)).toEqual({
      ok: false,
      error: "invalid_time_zone",
    });
  });
  it("SANTIAGO är America/Santiago", () => {
    expect(SANTIAGO).toBe("America/Santiago");
  });
});

describe("parseLocalDate", () => {
  it.each(["2028-02-29", "2026-10-02", "2026-12-31", "2026-01-01"])(
    "%s ok",
    (s) => {
      expect(parseLocalDate(s)).toEqual({ ok: true, value: s });
    },
  );
  it.each([
    ["2026-02-29", "invalid_date"],
    ["2026-04-31", "invalid_date"],
    ["2026-13-01", "invalid_date"],
    ["2026-00-10", "invalid_date"],
    ["2026-01-00", "invalid_date"],
    ["2026-2-3", "invalid_format"],
    ["2026-10-02T00:00", "invalid_format"],
    ["02-10-2026", "invalid_format"],
    ["", "invalid_format"],
  ])("%j → %s", (s, error) => {
    expect(parseLocalDate(s)).toEqual({ ok: false, error });
  });
});

describe("parseLocalTime", () => {
  it.each([
    ["09:30", "09:30"],
    ["09:30:00", "09:30"],
    ["00:00", "00:00"],
    ["23:59", "23:59"],
  ])("%s → %s", (s, expected) => {
    expect(parseLocalTime(s)).toEqual({ ok: true, value: expected });
  });
  it.each([
    ["9:30", "invalid_format"],
    ["0930", "invalid_format"],
    ["09:30:00.000", "invalid_format"],
    ["", "invalid_format"],
    ["23:60", "out_of_range"],
    ["25:00", "out_of_range"],
    ["10:30:15", "out_of_range"],
    ["24:00", "out_of_range"],
    ["24:01", "out_of_range"],
  ])("%j → %s", (s, error) => {
    expect(parseLocalTime(s)).toEqual({ ok: false, error });
  });
  it("24:00 godtas bara med allowEndOfDay", () => {
    expect(parseLocalTime("24:00", { allowEndOfDay: true })).toEqual({
      ok: true,
      value: "24:00",
    });
    expect(parseLocalTime("24:00:00", { allowEndOfDay: true })).toEqual({
      ok: true,
      value: "24:00",
    });
    expect(parseLocalTime("24:30", { allowEndOfDay: true })).toEqual({
      ok: false,
      error: "out_of_range",
    });
  });
});

describe("parseInstant", () => {
  it.each([
    ["2026-10-02T14:30:00Z", "2026-10-02T14:30:00.000Z"],
    ["2026-10-02T14:30:00.123Z", "2026-10-02T14:30:00.123Z"],
    ["2026-10-02T14:30:00+00:00", "2026-10-02T14:30:00.000Z"],
    ["2026-10-02 14:30:00+00", "2026-10-02T14:30:00.000Z"],
    ["2026-10-02 11:30:00-03", "2026-10-02T14:30:00.000Z"],
    ["2026-10-02T11:30:00-03:00", "2026-10-02T14:30:00.000Z"],
    ["2026-10-02T11:30-0300", "2026-10-02T14:30:00.000Z"],
    ["2026-10-02 14:30:00.123456+00", "2026-10-02T14:30:00.123Z"],
    ["2026-10-02t14:30:00z", "2026-10-02T14:30:00.000Z"],
  ])("%s → %s", (s, iso) => {
    const r = parseInstant(s);
    expect(r.ok && r.value.toISOString()).toBe(iso);
  });
  it.each([
    ["2026-10-02T14:30:00", "missing_offset"],
    ["2026-10-02T14:30", "missing_offset"],
    ["2026-10-02", "missing_offset"],
    ["2026-10-02 14:30:00", "missing_offset"],
    ["", "invalid_format"],
    ["hoy", "invalid_format"],
    ["2026-02-30T10:00:00Z", "invalid_format"],
    ["2026-10-02T24:00:00Z", "invalid_format"],
    ["2026-10-02T14:30:00+25:00", "invalid_format"],
    ["1759415400000", "invalid_format"],
  ])("%j → %s", (s, error) => {
    expect(parseInstant(s)).toEqual({ ok: false, error });
  });
});

describe("addLocalDays", () => {
  it.each([
    ["2026-09-05", 1, "2026-09-06"],
    ["2026-04-04", 1, "2026-04-05"],
    ["2026-01-31", 1, "2026-02-01"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2028-02-28", 1, "2028-02-29"],
    ["2028-02-29", 1, "2028-03-01"],
    ["2027-02-28", 1, "2027-03-01"],
    ["2026-03-01", -1, "2026-02-28"],
    ["2027-01-01", -1, "2026-12-31"],
    ["2026-10-02", 0, "2026-10-02"],
    ["2026-10-02", 365, "2027-10-02"],
    ["2026-10-02", -400, "2025-08-28"],
  ])("%s + %d = %s", (from, n, to) => {
    expect(addLocalDays(d(from), n)).toBe(to);
  });
  it("kastar för icke-heltal", () => {
    expect(() => addLocalDays(d("2026-10-02"), 1.5)).toThrow(RangeError);
  });
});

describe("veckodagar och veckor", () => {
  it.each([
    ["2026-09-28", 1],
    ["2026-10-02", 5],
    ["2026-10-03", 6],
    ["2026-10-04", 7],
    ["2028-02-29", 2],
  ])("isoWeekdayOf(%s) = %d", (date, wd) => {
    expect(isoWeekdayOf(d(date))).toBe(wd);
  });
  it.each([
    ["2026-10-04", "2026-09-28"],
    ["2026-09-28", "2026-09-28"],
    ["2026-10-02", "2026-09-28"],
    ["2027-01-01", "2026-12-28"],
  ])("startOfLocalWeek(%s) = %s (måndag)", (date, monday) => {
    expect(startOfLocalWeek(d(date))).toBe(monday);
  });
});

describe("eachLocalDate", () => {
  it("är inklusive gränserna (designens vecka 28 sep–4 okt)", () => {
    expect(eachLocalDate(d("2026-09-28"), d("2026-10-04"))).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
  });
  it("en dag", () => {
    expect(eachLocalDate(d("2026-10-02"), d("2026-10-02"))).toEqual([
      "2026-10-02",
    ]);
  });
  it("tomt om from > to", () => {
    expect(eachLocalDate(d("2026-10-03"), d("2026-10-02"))).toEqual([]);
  });
  it("tillåter 400 dagar och kastar över 400", () => {
    const from = d("2026-01-01");
    expect(eachLocalDate(from, addLocalDays(from, 399))).toHaveLength(400);
    expect(() => eachLocalDate(from, addLocalDays(from, 400))).toThrow(
      RangeError,
    );
  });
});

describe("toWallClock, toLocalDate och utcOffsetMinutes", () => {
  it("vanlig dag i oktober (−03)", () => {
    expect(toWallClock(utc("2026-10-02T18:00:00Z"), SANTIAGO)).toEqual({
      date: "2026-10-02",
      time: "15:00",
      weekday: 5,
      offsetMinutes: -180,
    });
  });
  it("vinter (−04)", () => {
    expect(utcOffsetMinutes(utc("2026-07-01T12:00:00Z"), SANTIAGO)).toBe(-240);
  });
  it("sekunder avrundas nedåt till minuten", () => {
    expect(toWallClock(utc("2026-10-02T18:00:59.999Z"), SANTIAGO).time).toBe(
      "15:00",
    );
  });
  it("kring midnatt", () => {
    expect(toLocalDate(utc("2026-10-03T02:30:00Z"), SANTIAGO)).toBe(
      "2026-10-02",
    );
    expect(toLocalDate(utc("2026-10-03T03:00:00Z"), SANTIAGO)).toBe(
      "2026-10-03",
    );
  });
  it("kastar för ogiltig Date", () => {
    expect(() => toWallClock(new Date(Number.NaN), SANTIAGO)).toThrow(
      RangeError,
    );
  });
});

describe("minutesBetween", () => {
  it("räknar verklig tid", () => {
    expect(
      minutesBetween(utc("2026-10-02T14:30:00Z"), utc("2026-10-02T15:05:00Z")),
    ).toBe(35);
    expect(
      minutesBetween(utc("2026-10-02T15:05:00Z"), utc("2026-10-02T14:30:00Z")),
    ).toBe(-35);
  });
});
