import { describe, expect, it } from "vitest";

import {
  slugify,
  validateDurationMin,
  validatePhone,
  validatePriceClp,
  validateRequired,
  validateSlug,
  validateTimeRange,
} from "./client-validation";

describe("slugify", () => {
  it.each([
    ["Barbería Central", "barberia-central"],
    ["  Ñuñoa Nails!! ", "nunoa-nails"],
    ["Corte & Barba", "corte-barba"],
    ["ab", ""], // för kort efter normalisering
  ])("%j → %j", (raw, expected) => {
    expect(slugify(raw)).toBe(expected);
  });
});

describe("validateSlug", () => {
  it("giltig slug", () => {
    expect(validateSlug("mi-negocio")).toEqual({
      ok: true,
      value: "mi-negocio",
    });
  });

  it("versaler normaliseras", () => {
    expect(validateSlug("Mi-Negocio")).toEqual({
      ok: true,
      value: "mi-negocio",
    });
  });

  it("för kort → business.slug_invalid", () => {
    expect(validateSlug("ab")).toEqual({
      ok: false,
      code: "business.slug_invalid",
    });
  });

  it("reserverad → business.slug_reserved", () => {
    expect(validateSlug("app")).toEqual({
      ok: false,
      code: "business.slug_reserved",
    });
  });
});

describe("validateRequired", () => {
  it("tomt → felkoden som skickats in", () => {
    expect(validateRequired("   ", "business.name_empty")).toEqual({
      ok: false,
      code: "business.name_empty",
    });
  });

  it("trimmar", () => {
    expect(validateRequired("  Ana  ", "x")).toEqual({
      ok: true,
      value: "Ana",
    });
  });
});

describe("validatePhone", () => {
  it("mobil giltig", () => {
    const r = validatePhone("+56 9 1234 5678");
    expect(r).toEqual({ ok: true, value: "+56912345678" });
  });

  it("fast nummer giltigt (mobile_or_fixed)", () => {
    const r = validatePhone("+56 2 2123 4567");
    expect(r.ok).toBe(true);
  });

  it("ogiltigt → phone.<kod>", () => {
    expect(validatePhone("123")).toEqual({
      ok: false,
      code: "phone.invalid_length",
    });
  });
});

describe("validatePriceClp", () => {
  it("giltigt belopp", () => {
    expect(validatePriceClp("18.000")).toEqual({ ok: true, value: 18000 });
  });

  it("tomt → clp.empty", () => {
    expect(validatePriceClp("")).toEqual({ ok: false, code: "clp.empty" });
  });
});

describe("validateDurationMin", () => {
  it.each(["30", "5", "600"])("%j giltig", (raw) => {
    expect(validateDurationMin(raw).ok).toBe(true);
  });

  it.each(["", "0", "601", "abc", "1.5"])(
    "%j → services.duration_invalid",
    (raw) => {
      expect(validateDurationMin(raw)).toEqual({
        ok: false,
        code: "services.duration_invalid",
      });
    },
  );
});

describe("validateTimeRange", () => {
  it("intervall giltigt", () => {
    const r = validateTimeRange("09:00", "19:00");
    expect(r).toEqual({ ok: true, value: { start: "09:00", end: "19:00" } });
  });

  it("start >= end → hours.business_hours_start_before_end", () => {
    expect(validateTimeRange("19:00", "09:00")).toEqual({
      ok: false,
      code: "hours.business_hours_start_before_end",
    });
  });

  it("ogiltig tid → time.<kod>", () => {
    expect(validateTimeRange("25:00", "19:00")).toEqual({
      ok: false,
      code: "time.out_of_range",
    });
  });
});
