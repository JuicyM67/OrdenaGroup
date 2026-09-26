import { describe, expect, it } from "vitest";

import { parseInstant, SANTIAGO, utcOffsetMinutes } from "./dates";

/**
 * Canary för tzdata. 2022 sköts sommartidens start upp en vecka
 * (folkomröstningen 4 sep). Misslyckas testet saknar Node/ICU tzdata ≥ 2022b.
 */
const TZDATA_FLOOR = "2025b"; // Node 24.13.0 / ICU 77.1 (WP-04, steg 1)

const utc = (s: string): Date => {
  const r = parseInstant(s);
  if (!r.ok) throw new Error(`fixture: ${s}`);
  return r.value;
};

describe("tzdata canary", () => {
  it("2022: bytet skedde 11 sep, inte 4 sep", () => {
    expect(utcOffsetMinutes(utc("2022-09-04T12:00:00Z"), SANTIAGO)).toBe(-240);
    expect(utcOffsetMinutes(utc("2022-09-10T12:00:00Z"), SANTIAGO)).toBe(-240);
    expect(utcOffsetMinutes(utc("2022-09-11T12:00:00Z"), SANTIAGO)).toBe(-180);
  });

  it(`process.versions.tz finns och är ≥ ${TZDATA_FLOOR}`, () => {
    const tz = process.versions.tz;
    expect(typeof tz).toBe("string");
    expect((tz ?? "") >= TZDATA_FLOOR).toBe(true);
  });
});
