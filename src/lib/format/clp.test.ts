import { describe, expect, it } from "vitest";

import { CLP_MAX, formatClp, isClp, parseClp } from "./clp";

describe("formatClp", () => {
  it.each([
    [0, "$0"],
    [1, "$1"],
    [999, "$999"],
    [1000, "$1.000"],
    [1234567, "$1.234.567"],
    [CLP_MAX, "$2.147.483.647"],
    [-3000, "−$3.000"],
    [-0, "$0"],
  ])("%d → %s", (n, expected) => {
    expect(formatClp(n)).toBe(expected);
  });

  it.each([
    [8000, "$8.000"],
    [12000, "$12.000"],
    [14400, "$14.400"],
    [18000, "$18.000"],
    [72000, "$72.000"],
    [84000, "$84.000"],
    [486000, "$486.000"],
    [3000, "$3.000"],
  ])("designvärde %d → %s tecken för tecken", (n, expected) => {
    const out = formatClp(n);
    expect(out).toBe(expected);
    // Bara ASCII-siffror, "$" och "." – ingen NBSP, inget mellanslag.
    expect([...out].every((c) => /[0-9$.]/.test(c))).toBe(true);
    expect(out.charCodeAt(0)).toBe(0x24);
    expect(out).not.toMatch(/[\s  ]/);
  });

  it("negativt belopp använder U+2212 som designens −20%", () => {
    expect(formatClp(-3000).codePointAt(0)).toBe(0x2212);
  });

  it.each([
    18000.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    CLP_MAX + 1,
    -(CLP_MAX + 1),
  ])("kastar RangeError för %s", (n) => {
    expect(() => formatClp(n)).toThrow(RangeError);
  });
});

describe("isClp", () => {
  it.each([0, 1, 18000, CLP_MAX])("%s är Clp", (v) => {
    expect(isClp(v)).toBe(true);
  });
  it.each([-1, 0.5, CLP_MAX + 1, Number.NaN, "18000", null, undefined])(
    "%s är inte Clp",
    (v) => {
      expect(isClp(v)).toBe(false);
    },
  );
});

describe("parseClp", () => {
  it.each([
    ["18000", 18000],
    ["18.000", 18000],
    ["$18.000", 18000],
    ["$ 18.000", 18000],
    [" 18.000 ", 18000],
    ["0", 0],
    ["$0", 0],
    ["999", 999],
    ["1.234.567", 1234567],
    ["2.147.483.647", CLP_MAX],
    [" 18.000 ", 18000],
  ])("godtar %j → %d", (input, expected) => {
    expect(parseClp(input)).toEqual({ ok: true, value: expected });
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["$", "invalid_format"],
    ["18.000,5", "invalid_format"],
    ["18000.50", "invalid_format"],
    ["18000,5", "invalid_format"],
    ["1.8000", "invalid_format"],
    ["18,000", "invalid_format"],
    ["-3000", "invalid_format"],
    ["−3.000", "invalid_format"],
    ["$-3.000", "invalid_format"],
    ["abc", "invalid_format"],
    ["18 000", "invalid_format"],
    [".000", "invalid_format"],
    ["18.", "invalid_format"],
    ["1e5", "invalid_format"],
    ["18000$", "invalid_format"],
    ["$$18.000", "invalid_format"],
    ["2147483648", "out_of_range"],
    ["2.147.483.648", "out_of_range"],
    ["99999999999999999999", "out_of_range"],
  ])("avvisar %j → %s", (input, error) => {
    expect(parseClp(input)).toEqual({ ok: false, error });
  });

  it.each([0, 1, 999, 1000, 18000, 486000, 1234567, CLP_MAX])(
    "rundtur parseClp(formatClp(%d))",
    (n) => {
      expect(parseClp(formatClp(n))).toEqual({ ok: true, value: n });
    },
  );
});
