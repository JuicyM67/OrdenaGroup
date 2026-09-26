import { describe, expect, it } from "vitest";

import { formatRut, parseRut, rutCheckDigit, type Rut } from "./rut";

describe("rutCheckDigit (modulo 11)", () => {
  it.each([
    [12345678, "5"],
    [11111111, "1"],
    [1000005, "K"],
    [10000004, "0"],
    [1, "9"],
    [99999999, "9"],
  ])("%d → %s", (body, dv) => {
    expect(rutCheckDigit(body)).toBe(dv);
  });

  it("kastar RangeError för kropp utanför 1–99 999 999 eller icke-heltal", () => {
    expect(() => rutCheckDigit(0)).toThrow(RangeError);
    expect(() => rutCheckDigit(100_000_000)).toThrow(RangeError);
    expect(() => rutCheckDigit(1.5)).toThrow(RangeError);
  });

  it("egenskap: exakt en av 11 kontrollsiffror är giltig (steg 7919)", () => {
    const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "K"];
    let checked = 0;
    for (let body = 1; body <= 99_999_999; body += 7919) {
      const valid = digits.filter((dv) => parseRut(`${body}-${dv}`).ok);
      expect(valid).toEqual([rutCheckDigit(body)]);
      checked++;
    }
    expect(checked).toBeGreaterThan(12_000);
  });
});

describe("parseRut", () => {
  it.each([
    ["12.345.678-5", "12345678-5"],
    ["12345678-5", "12345678-5"],
    ["123456785", "12345678-5"],
    [" 12.345.678 - 5 ", "12345678-5"],
    ["1.000.005-k", "1000005-K"],
    ["1000005K", "1000005-K"],
    ["0012.345.678-5", "12345678-5"],
    ["10.000.004-0", "10000004-0"],
    ["1-9", "1-9"],
    [" 12.345.678-5", "12345678-5"],
  ])("%j → %s", (input, canonical) => {
    expect(parseRut(input)).toEqual({ ok: true, value: canonical });
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["12.345.678-4", "invalid_check_digit"],
    ["1.000.005-0", "invalid_check_digit"],
    ["abc", "invalid_format"],
    ["12345678-X", "invalid_format"],
    ["5", "invalid_format"],
    ["-5", "invalid_format"],
    ["12-345-678-5", "invalid_format"],
    ["12,345,678-5", "invalid_format"],
    ["0-0", "out_of_range"],
    ["000-0", "out_of_range"],
    ["123.456.789-2", "out_of_range"],
    ["99999999999999999999999-1", "out_of_range"],
  ])("%j → %s", (input, error) => {
    expect(parseRut(input)).toEqual({ ok: false, error });
  });
});

describe("formatRut", () => {
  it.each([
    ["1000005-K", "1.000.005-K"],
    ["12345678-5", "12.345.678-5"],
    ["1-9", "1-9"],
    ["10000004-0", "10.000.004-0"],
  ])("%s → %s", (canonical, expected) => {
    expect(formatRut(canonical as Rut)).toBe(expected);
  });

  it("rundtur parseRut(formatRut(r)) = r", () => {
    const r = parseRut("12345678-5");
    if (!r.ok) throw new Error("setup");
    expect(parseRut(formatRut(r.value))).toEqual(r);
  });
});
