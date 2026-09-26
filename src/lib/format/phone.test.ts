import { describe, expect, it } from "vitest";

import {
  E164_PATTERN,
  formatPhone,
  isE164,
  maskPhone,
  parseChileanPhone,
  type E164,
} from "./phone";

const NBSP = " ";

describe("parseChileanPhone (mobil, standard)", () => {
  it.each([
    "+56 9 1234 5678",
    "+56912345678",
    "56912345678",
    "912345678",
    "9 1234 5678",
    "(+56) 9-1234-5678",
    "+56 (9) 1234.5678",
    "0056 9 1234 5678",
    " +56 9 1234 5678 ",
    `+56${NBSP}9${NBSP}1234${NBSP}5678`,
    `‪+56 9 1234 5678‬`.replace(/[‪‬]/g, ""),
    "+56\t9 1234 5678",
  ])("%j → +56912345678", (input) => {
    expect(parseChileanPhone(input)).toEqual({
      ok: true,
      value: "+56912345678",
    });
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["+56 9 1234 567a", "invalid_chars"],
    ["+56 9 1234/5678", "invalid_chars"],
    ["56+912345678", "invalid_chars"],
    ["++56912345678", "invalid_chars"],
    ["+56 9 1234 567", "invalid_length"],
    ["91234567", "invalid_length"],
    ["9123456789", "invalid_length"],
    ["+56 9 1234 56789", "invalid_length"],
    ["12345678", "invalid_length"],
    ["+56", "invalid_length"],
    ["+54 9 11 1234 5678", "not_chilean"],
    ["+1 415 555 0100", "not_chilean"],
    ["0054 9 11 1234 5678", "not_chilean"],
    ["+56 2 2123 4567", "not_mobile"],
    ["+56 32 212 3456", "not_mobile"],
    ["600 123 4567", "invalid_length"],
    ["600 123 456", "not_mobile"],
    ["800 123 456", "not_mobile"],
    ["112345678", "not_mobile"],
  ])("%j → %s", (input, error) => {
    expect(parseChileanPhone(input)).toEqual({ ok: false, error });
  });
});

describe("parseChileanPhone (mobile_or_fixed, företagets telefon F1)", () => {
  const opts = { allow: "mobile_or_fixed" } as const;
  it.each([
    ["+56 2 2123 4567", "+56221234567"],
    ["22123 4567", "+56221234567"],
    ["+56 32 212 3456", "+56322123456"],
    ["(61) 221 2345", "+56612212345"],
    ["+56 9 1234 5678", "+56912345678"],
  ])("%j → %s", (input, expected) => {
    expect(parseChileanPhone(input, opts)).toEqual({
      ok: true,
      value: expected,
    });
  });

  it.each([
    ["600 123 456", "not_mobile"],
    ["800 123 456", "not_mobile"],
    ["112345678", "not_mobile"],
    ["012345678", "not_mobile"],
    ["+54 11 1234 5678", "not_chilean"],
  ])("avvisar %j → %s", (input, error) => {
    expect(parseChileanPhone(input, opts)).toEqual({ ok: false, error });
  });
});

describe("formatPhone", () => {
  it.each([
    ["+56912345678", "+56 9 1234 5678"],
    ["+56221234567", "+56 2 2123 4567"],
    ["+56322123456", "+56 32 212 3456"],
    ["+56612212345", "+56 61 221 2345"],
  ])("%s → %s", (e164, expected) => {
    expect(formatPhone(e164 as E164)).toBe(expected);
  });

  it("rundtur parseChileanPhone(formatPhone(p)) = p", () => {
    for (const p of ["+56912345678", "+56221234567", "+56322123456"]) {
      expect(
        parseChileanPhone(formatPhone(p as E164), { allow: "mobile_or_fixed" }),
      ).toEqual({ ok: true, value: p });
    }
  });

  it("lämnar utländska E.164 orörda", () => {
    expect(formatPhone("+14155550100" as E164)).toBe("+14155550100");
  });
});

describe("maskPhone", () => {
  it("som i Agenda.dc.html (EventPopover)", () => {
    expect(maskPhone("+56912344821" as E164)).toBe("+56 9 •••• 4821");
  });

  it.each(["+56912344821", "+56221234567", "+56322123456", "+14155550100"])(
    "%s visar aldrig mittsiffrorna",
    (p) => {
      const masked = maskPhone(p as E164);
      const middle = p.slice(-8, -4);
      expect(masked).not.toContain(middle);
      expect(masked.endsWith(p.slice(-4))).toBe(true);
      expect(masked.replace(/\D/g, "").length).toBeLessThanOrEqual(
        p.replace(/\D/g, "").length - 3,
      );
    },
  );
});

describe("isE164 och E164_PATTERN (samma som DB-checken)", () => {
  const dbCheck = /^\+[1-9][0-9]{7,14}$/;
  it("mönstret är identiskt med DATA_MODEL", () => {
    expect(E164_PATTERN.source).toBe(dbCheck.source);
  });
  it.each([
    "+56912345678",
    "+12345678",
    "+123456789012345",
    "+0912345678",
    "+1234567",
    "+1234567890123456",
    "56912345678",
    "+56 9 1234 5678",
    "",
    "+",
    "+56912345678\n",
  ])("%j ger samma svar som DB-checken", (v) => {
    expect(isE164(v)).toBe(dbCheck.test(v));
  });
});
