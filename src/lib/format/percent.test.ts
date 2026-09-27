import { describe, expect, it } from "vitest";

import { formatPercent } from "./percent";

describe("formatPercent (procentenheter, som discount_pct och deposit_value)", () => {
  it.each([
    [4, "4%"],
    [0, "0%"],
    [20, "20%"],
    [100, "100%"],
    [-20, "−20%"],
  ])("%d → %s", (points, expected) => {
    expect(formatPercent(points)).toBe(expected);
  });

  it("minus är U+2212, som i designens −20%", () => {
    expect(formatPercent(-20).codePointAt(0)).toBe(0x2212);
  });

  it("avrundar till heltal (halva bort från noll)", () => {
    expect(formatPercent(3.6)).toBe("4%");
    expect(formatPercent(4.4)).toBe("4%");
    expect(formatPercent(4.5)).toBe("5%");
    expect(formatPercent(-4.5)).toBe("−5%");
  });

  it("negativ nolla efter avrundning blir 0%", () => {
    expect(formatPercent(-0.2)).toBe("0%");
    expect(formatPercent(-0)).toBe("0%");
  });

  it("inget mellanslag före %", () => {
    expect(formatPercent(4)).not.toMatch(/\s/);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "kastar RangeError för %s",
    (v) => {
      expect(() => formatPercent(v)).toThrow(RangeError);
    },
  );
});
