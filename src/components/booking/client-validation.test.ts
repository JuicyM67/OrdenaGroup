import { describe, expect, it } from "vitest";

import {
  EMAIL_MAX,
  NAME_MAX,
  validateEmail,
  validateRequiredEmail,
  validateName,
  validatePhone,
} from "./client-validation";

describe("validateName", () => {
  it("tomt namn ger name.empty", () => {
    expect(validateName("   ")).toEqual({ ok: false, code: "name.empty" });
  });

  it("trimmar namnet", () => {
    expect(validateName("  Joaquín  ")).toEqual({
      ok: true,
      value: "Joaquín",
    });
  });

  it(`namn med exakt ${NAME_MAX} tecken godkänns (gränsen sätts som maxLength på fältet, se filkommentaren)`, () => {
    const max = "a".repeat(NAME_MAX);
    expect(validateName(max)).toEqual({ ok: true, value: max });
  });
});

describe("validatePhone", () => {
  it.each([
    ["", "phone.empty"],
    ["+56 9 1234 abcd", "phone.invalid_chars"],
    ["+54 9 11 1234 5678", "phone.not_chilean"],
    ["+56 9 1234 567", "phone.invalid_length"],
    ["+56 2 2123 4567", "phone.not_mobile"],
  ])("%s → %s", (raw, code) => {
    expect(validatePhone(raw)).toEqual({ ok: false, code });
  });

  it("+56 9 1234 5678 godkänns och blir E.164", () => {
    expect(validatePhone("+56 9 1234 5678")).toEqual({
      ok: true,
      value: "+56912345678",
    });
  });
});

describe("validateEmail", () => {
  it("tom sträng är giltig (valfri), value: undefined", () => {
    expect(validateEmail("")).toEqual({ ok: true, value: undefined });
  });

  it("giltig e-post trimmas", () => {
    expect(validateEmail("  ana@ejemplo.cl  ")).toEqual({
      ok: true,
      value: "ana@ejemplo.cl",
    });
  });

  it("ogiltig e-post ger email.invalid", () => {
    expect(validateEmail("no-es-correo")).toEqual({
      ok: false,
      code: "email.invalid",
    });
  });

  it(`e-post längre än ${EMAIL_MAX} tecken ger email.invalid`, () => {
    const long = `${"a".repeat(EMAIL_MAX)}@ejemplo.cl`;
    expect(validateEmail(long)).toEqual({ ok: false, code: "email.invalid" });
  });
});

describe("validateRequiredEmail (D-030: obligatorisk i Reserva)", () => {
  it("tom sträng ger email.invalid", () => {
    expect(validateRequiredEmail("")).toEqual({
      ok: false,
      code: "email.invalid",
    });
  });

  it("giltig e-post godkänns och trimmas", () => {
    expect(validateRequiredEmail("  ana@ejemplo.cl  ")).toEqual({
      ok: true,
      value: "ana@ejemplo.cl",
    });
  });

  it("ogiltig e-post ger email.invalid", () => {
    expect(validateRequiredEmail("no-es-correo")).toEqual({
      ok: false,
      code: "email.invalid",
    });
  });
});
