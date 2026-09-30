import { describe, expect, it } from "vitest";

import { negocio } from "@/i18n";

import { onboardingInputSchema, RESERVED_SLUGS, RUBRO_KEYS } from "./schemas";

function validInput() {
  return {
    acceptedTerms: true,
    business: {
      name: "Barbería Central",
      slug: "barberia-central",
      comuna: "Providencia",
      category: "barberia",
      phone: "+56912345678",
    },
    services: [{ name: "Corte", durationMin: 30, priceClp: "12000" }],
    staff: [{ name: "Diego", serviceIndexes: [0] }],
    hours: [
      { weekday: 1, open: true, start: "09:00", end: "19:00" },
      { weekday: 7, open: false },
    ],
  };
}

// "r" (för kort) och "_next" (understreck) misslyckas redan formatet (SLUG_PATTERN) —
// bara reserverade ord som i övrigt är giltiga slugs testar själva reserverad-kontrollen.
const FORMAT_VALID_RESERVED = RESERVED_SLUGS.filter((s) =>
  /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(s),
);

describe("RUBRO_KEYS speglar negocio.rubros (es-CL.ts)", () => {
  it("samma nycklar", () => {
    expect(new Set(RUBRO_KEYS)).toEqual(new Set(Object.keys(negocio.rubros)));
  });
});

describe("onboardingInputSchema", () => {
  it("godtar ett giltigt värde", () => {
    const r = onboardingInputSchema.safeParse(validInput());
    expect(r.success).toBe(true);
  });

  it("tomt namn → business.name_empty", () => {
    const input = validInput();
    input.business.name = "  ";
    const r = onboardingInputSchema.safeParse(input);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("business.name_empty");
  });

  it.each([
    ["ab", "business.slug_invalid"], // för kort
    ["-abc", "business.slug_invalid"], // börjar med bindestreck
    ["Abc-Def", "business.slug_invalid"], // versaler
    ["a".repeat(41), "business.slug_invalid"], // för lång
  ])("ogiltig slug %j → %s", (slug, code) => {
    const input = validInput();
    input.business.slug = slug;
    const r = onboardingInputSchema.safeParse(input);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe(code);
  });

  it.each(FORMAT_VALID_RESERVED)(
    "reserverad slug %j → business.slug_reserved",
    (slug) => {
      const input = validInput();
      input.business.slug = slug;
      const r = onboardingInputSchema.safeParse(input);
      expect(r.success).toBe(false);
      expect(r.error?.issues[0]?.message).toBe("business.slug_reserved");
    },
  );

  it("okänd category → business.category_invalid", () => {
    const input = validInput();
    input.business.category = "no-existe";
    const r = onboardingInputSchema.safeParse(input);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("business.category_invalid");
  });

  it("ogiltigt telefonnummer → phone.*", () => {
    const input = validInput();
    input.business.phone = "123";
    const r = onboardingInputSchema.safeParse(input);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/^phone\./);
  });

  it("tjänst utan namn → services.name_empty", () => {
    const input = validInput();
    input.services = [{ name: "", durationMin: 30, priceClp: "1000" }];
    const r = onboardingInputSchema.safeParse(input);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("services.name_empty");
  });

  it("duration 0 → services.duration_invalid", () => {
    const input = validInput();
    input.services = [{ name: "Corte", durationMin: 0, priceClp: "1000" }];
    const r = onboardingInputSchema.safeParse(input);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("services.duration_invalid");
  });

  it("duration som sträng coercas till nummer", () => {
    const input: unknown = {
      ...validInput(),
      services: [{ name: "Corte", durationMin: "30", priceClp: "12000" }],
    };
    const r = onboardingInputSchema.safeParse(input);
    expect(r.success).toBe(true);
    expect(r.data?.services[0]?.durationMin).toBe(30);
  });

  it("negativt pris → clp.*", () => {
    const input = validInput();
    input.services = [{ name: "Corte", durationMin: 30, priceClp: "-1" }];
    const r = onboardingInputSchema.safeParse(input);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/^clp\./);
  });

  it("staff.serviceIndexes utanför services-arrayen → staff.service_index_out_of_range", () => {
    const input = validInput();
    input.staff = [{ name: "Diego", serviceIndexes: [5] }];
    const r = onboardingInputSchema.safeParse(input);
    expect(r.success).toBe(false);
    expect(
      r.error?.issues.some(
        (i) => i.message === "staff.service_index_out_of_range",
      ),
    ).toBe(true);
  });

  it("öppen dag utan start/end → hours.range_required", () => {
    const input = validInput();
    input.hours = [{ weekday: 1, open: true }];
    const r = onboardingInputSchema.safeParse(input);
    expect(r.success).toBe(false);
    expect(
      r.error?.issues.some((i) => i.message === "hours.range_required"),
    ).toBe(true);
  });

  it("start >= end → hours.business_hours_start_before_end", () => {
    const input = validInput();
    input.hours = [{ weekday: 1, open: true, start: "19:00", end: "09:00" }];
    const r = onboardingInputSchema.safeParse(input);
    expect(r.success).toBe(false);
    expect(
      r.error?.issues.some(
        (i) => i.message === "hours.business_hours_start_before_end",
      ),
    ).toBe(true);
  });

  it("samma veckodag två gånger → hours.weekday_duplicate", () => {
    const input = validInput();
    input.hours = [
      { weekday: 1, open: false },
      { weekday: 1, open: false },
    ];
    const r = onboardingInputSchema.safeParse(input);
    expect(r.success).toBe(false);
    expect(
      r.error?.issues.some((i) => i.message === "hours.weekday_duplicate"),
    ).toBe(true);
  });

  it("tomma services/staff/hours-listor är giltiga (allt är valfritt utöver negocio)", () => {
    const input = validInput();
    input.services = [];
    input.staff = [];
    input.hours = [];
    const r = onboardingInputSchema.safeParse(input);
    expect(r.success).toBe(true);
  });
});
