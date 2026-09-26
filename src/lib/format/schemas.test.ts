import { describe, expect, it } from "vitest";
import type { z } from "zod";

import { CLP_MAX } from "./clp";
import {
  chileanMobileInputSchema,
  chileanPhoneInputSchema,
  clpInputSchema,
  clpSchema,
  e164Schema,
  instantSchema,
  localDateSchema,
  localEndTimeSchema,
  localTimeSchema,
  rutInputSchema,
  timeZoneSchema,
} from "./schemas";

function messages(schema: z.ZodType, input: unknown): string[] {
  const r = schema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.message);
}

function value(schema: z.ZodType, input: unknown): unknown {
  const r = schema.safeParse(input);
  if (!r.success) throw new Error(JSON.stringify(r.error.issues));
  return r.data;
}

// Felkoder: "<område>.<kod>", bara ASCII, ingen spansk text.
const CODE = /^(clp|rut|phone|date|time|instant|tz)\.[a-z_]+$/;

const failing: [string, z.ZodType, unknown, string][] = [
  ["clpSchema", clpSchema, -1, "clp.out_of_range"],
  ["clpSchema", clpSchema, CLP_MAX + 1, "clp.out_of_range"],
  ["clpSchema", clpSchema, 18000.5, "clp.invalid_format"],
  ["clpSchema", clpSchema, "18000", "clp.invalid_type"],
  ["clpInputSchema", clpInputSchema, "", "clp.empty"],
  ["clpInputSchema", clpInputSchema, "18.000,5", "clp.invalid_format"],
  ["clpInputSchema", clpInputSchema, "9.999.999.999", "clp.out_of_range"],
  ["clpInputSchema", clpInputSchema, 18000, "clp.invalid_type"],
  ["e164Schema", e164Schema, "56912345678", "phone.invalid_format"],
  ["e164Schema", e164Schema, 56912345678, "phone.invalid_type"],
  ["chileanMobileInputSchema", chileanMobileInputSchema, "", "phone.empty"],
  [
    "chileanMobileInputSchema",
    chileanMobileInputSchema,
    "+56 9 1234 567a",
    "phone.invalid_chars",
  ],
  [
    "chileanMobileInputSchema",
    chileanMobileInputSchema,
    "+54 9 11 1234 5678",
    "phone.not_chilean",
  ],
  [
    "chileanMobileInputSchema",
    chileanMobileInputSchema,
    "12345678",
    "phone.invalid_length",
  ],
  [
    "chileanMobileInputSchema",
    chileanMobileInputSchema,
    "+56 2 2123 4567",
    "phone.not_mobile",
  ],
  [
    "chileanPhoneInputSchema",
    chileanPhoneInputSchema,
    "800 123 456",
    "phone.not_mobile",
  ],
  ["rutInputSchema", rutInputSchema, "", "rut.empty"],
  ["rutInputSchema", rutInputSchema, "abc", "rut.invalid_format"],
  ["rutInputSchema", rutInputSchema, "12.345.678-4", "rut.invalid_check_digit"],
  ["rutInputSchema", rutInputSchema, "0-0", "rut.out_of_range"],
  ["rutInputSchema", rutInputSchema, null, "rut.invalid_type"],
  ["localDateSchema", localDateSchema, "2026-2-3", "date.invalid_format"],
  ["localDateSchema", localDateSchema, "2026-02-29", "date.invalid_date"],
  ["localDateSchema", localDateSchema, undefined, "date.invalid_type"],
  ["localTimeSchema", localTimeSchema, "9:30", "time.invalid_format"],
  ["localTimeSchema", localTimeSchema, "24:00", "time.out_of_range"],
  ["localEndTimeSchema", localEndTimeSchema, "24:30", "time.out_of_range"],
  ["localTimeSchema", localTimeSchema, 930, "time.invalid_type"],
  ["timeZoneSchema", timeZoneSchema, "Mars/Olympus", "tz.invalid_time_zone"],
  ["timeZoneSchema", timeZoneSchema, 0, "tz.invalid_type"],
  [
    "instantSchema",
    instantSchema,
    "2026-10-02T14:30:00",
    "instant.missing_offset",
  ],
  ["instantSchema", instantSchema, "igår", "instant.invalid_format"],
  ["instantSchema", instantSchema, 1759415400000, "instant.invalid_type"],
];

describe("scheman misslyckas med felkod som message", () => {
  it.each(failing)("%s(%j) → %s", (_name, schema, input, code) => {
    const msgs = messages(schema, input);
    expect(msgs).toEqual([code]);
    expect(msgs[0]).toMatch(CODE);
  });

  it("inga issues innehåller spansk text eller mellanslag", () => {
    for (const [, schema, input] of failing) {
      for (const m of messages(schema, input)) {
        expect(m).toMatch(CODE);
      }
    }
  });
});

describe("scheman lyckas och normaliserar", () => {
  it("clp", () => {
    expect(value(clpSchema, 18000)).toBe(18000);
    expect(value(clpSchema, 0)).toBe(0);
    expect(value(clpInputSchema, "$18.000")).toBe(18000);
  });
  it("telefon → E.164", () => {
    expect(value(e164Schema, "+56912345678")).toBe("+56912345678");
    expect(value(chileanMobileInputSchema, "(+56) 9-1234-5678")).toBe(
      "+56912345678",
    );
    expect(value(chileanPhoneInputSchema, "+56 2 2123 4567")).toBe(
      "+56221234567",
    );
    expect(value(chileanPhoneInputSchema, "9 1234 5678")).toBe("+56912345678");
  });
  it("rut → kanonisk", () => {
    expect(value(rutInputSchema, "1.000.005-k")).toBe("1000005-K");
  });
  it("datum, tid, tidszon och instant", () => {
    expect(value(localDateSchema, "2028-02-29")).toBe("2028-02-29");
    expect(value(localTimeSchema, "09:30:00")).toBe("09:30");
    expect(value(localEndTimeSchema, "24:00")).toBe("24:00");
    expect(value(localEndTimeSchema, "19:00")).toBe("19:00");
    expect(value(timeZoneSchema, "America/Santiago")).toBe("America/Santiago");
    const inst = value(instantSchema, "2026-10-02 14:30:00+00");
    expect(inst).toBeInstanceOf(Date);
    expect((inst as Date).toISOString()).toBe("2026-10-02T14:30:00.000Z");
  });
});
