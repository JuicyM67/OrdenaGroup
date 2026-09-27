import { afterEach, describe, expect, it } from "vitest";

import {
  ALL_WEEK,
  d,
  DIEGO,
  hours,
  norte,
  staff,
  utc,
} from "../__fixtures__/snapshot";
import { workingWindows } from "./windows";

const iv = (a: string, b: string) => ({ start: utc(a), end: utc(b) });

function winFor(
  date: string,
  from: string,
  to: string,
): { start: number; end: number }[] {
  const s = norte({
    businessHours: hours(ALL_WEEK, from, to),
    staff: [staff(DIEGO, 1)],
  });
  return workingWindows(s, s.staff[0]!, d(date));
}

const cases: [string, string, string, { start: number; end: number }[]][] = [
  // Vanliga dagar kring bytena: 10:00–19:00.
  [
    "2026-09-05",
    "10:00",
    "19:00",
    [iv("2026-09-05T14:00Z", "2026-09-05T23:00Z")],
  ],
  [
    "2026-09-06",
    "10:00",
    "19:00",
    [iv("2026-09-06T13:00Z", "2026-09-06T22:00Z")],
  ],
  [
    "2026-04-04",
    "10:00",
    "19:00",
    [iv("2026-04-04T13:00Z", "2026-04-04T22:00Z")],
  ],
  [
    "2026-04-05",
    "10:00",
    "19:00",
    [iv("2026-04-05T14:00Z", "2026-04-05T23:00Z")],
  ],
  // 23-timmarsdag: 00:00 finns inte, fönstret börjar 01:00 −03 (60 verkliga minuter).
  [
    "2026-09-06",
    "00:00",
    "02:00",
    [iv("2026-09-06T04:00Z", "2026-09-06T05:00Z")],
  ],
  // 25-timmarsdag: 22:00–24:00 är 180 verkliga minuter.
  [
    "2026-04-04",
    "22:00",
    "24:00",
    [iv("2026-04-05T01:00Z", "2026-04-05T04:00Z")],
  ],
  // Starttid i glappet flyttas fram (compatible): 00:30 → 01:30 −03.
  [
    "2026-09-06",
    "00:30",
    "03:00",
    [iv("2026-09-06T04:30Z", "2026-09-06T06:00Z")],
  ],
  // Tvetydig sluttid: första förekomsten (−03).
  [
    "2026-04-04",
    "21:00",
    "23:30",
    [iv("2026-04-05T00:00Z", "2026-04-05T02:30Z")],
  ],
  // 2027.
  [
    "2027-04-03",
    "22:00",
    "24:00",
    [iv("2027-04-04T01:00Z", "2027-04-04T04:00Z")],
  ],
  [
    "2027-09-05",
    "00:00",
    "02:00",
    [iv("2027-09-05T04:00Z", "2027-09-05T05:00Z")],
  ],
  [
    "2027-04-03",
    "10:00",
    "19:00",
    [iv("2027-04-03T13:00Z", "2027-04-03T22:00Z")],
  ],
  [
    "2027-09-05",
    "10:00",
    "19:00",
    [iv("2027-09-05T13:00Z", "2027-09-05T22:00Z")],
  ],
  // Dagen före 23-timmarsdagen slutar 24:00 = 04:00Z (nästa dags början).
  [
    "2026-09-05",
    "22:00",
    "24:00",
    [iv("2026-09-06T02:00Z", "2026-09-06T04:00Z")],
  ],
];

describe.each([
  "UTC",
  "America/Santiago",
  "Europe/Stockholm",
  "America/Los_Angeles",
])("arbetsfönster kring sommartid (TZ=%s)", (hostTz) => {
  const original = process.env.TZ;
  afterEach(() => {
    process.env.TZ = original;
  });

  it.each(cases)("%s %s–%s", (date, from, to, expected) => {
    process.env.TZ = hostTz;
    expect(winFor(date, from, to)).toEqual(expected);
  });
});
