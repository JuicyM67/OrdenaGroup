import { describe, expect, it } from "vitest";

import { reserva } from "@/i18n";
import type { PhoneError } from "@/lib/format/phone";

import { customerFormSchema, type CustomerFormInput } from "./form-schema";

function baseInput(
  overrides: Partial<CustomerFormInput> = {},
): CustomerFormInput {
  return {
    name: "Joaquín",
    phone: "+56 9 1234 5678",
    email: "",
    termsAccepted: true,
    marketing: false,
    consentVersion: reserva.consentimientos.version,
    idempotencyKey: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    serviceId: "cb",
    staffId: "any",
    date: "2026-10-06",
    slotId: "slot-1130",
    ...overrides,
  };
}

const PHONE_CASES: readonly [string, PhoneError][] = [
  ["", "empty"],
  ["+56 9 1234 abcd", "invalid_chars"],
  ["+54 9 11 1234 5678", "not_chilean"],
  ["+56 9 1234 567", "invalid_length"],
  ["+56 2 2123 4567", "not_mobile"],
];

describe("customerFormSchema — telefon", () => {
  it.each(PHONE_CASES)("%s → phone.%s", (phone, code) => {
    const result = customerFormSchema.safeParse(baseInput({ phone }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(`phone.${code}`);
    }
  });

  it.each(["9 1234 5678", "+56912345678", "0056 9 1234 5678"])(
    "%s godkänns och blir E.164",
    (phone) => {
      const result = customerFormSchema.safeParse(baseInput({ phone }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone).toBe("+56912345678");
      }
    },
  );
});

describe("customerFormSchema — namn, e-post, samtycken", () => {
  it("tomt namn avvisas", () => {
    const result = customerFormSchema.safeParse(baseInput({ name: "  " }));
    expect(result.success).toBe(false);
  });

  it("namnet trimmas", () => {
    const result = customerFormSchema.safeParse(
      baseInput({ name: "  Joaquín  " }),
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Joaquín");
  });

  it("tom e-post är giltig (valfri)", () => {
    expect(customerFormSchema.safeParse(baseInput({ email: "" })).success).toBe(
      true,
    );
  });

  it("ogiltig e-post avvisas", () => {
    expect(
      customerFormSchema.safeParse(baseInput({ email: "no-es-correo" }))
        .success,
    ).toBe(false);
  });

  it("termsAccepted: false avvisas (consentimientoRequerido)", () => {
    const result = customerFormSchema.safeParse(
      baseInput({ termsAccepted: false as unknown as true }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("terms.required");
    }
  });

  it("marketing som saknas (inte ett explicit false) avvisas", () => {
    const input = baseInput();
    const withoutMarketing = { ...input } as Partial<CustomerFormInput>;
    delete withoutMarketing.marketing;
    expect(customerFormSchema.safeParse(withoutMarketing).success).toBe(false);
  });

  it("marketing explicit false godkänns", () => {
    expect(
      customerFormSchema.safeParse(baseInput({ marketing: false })).success,
    ).toBe(true);
  });

  it("consentVersion som inte matchar es-CL-versionen avvisas", () => {
    expect(
      customerFormSchema.safeParse(
        baseInput({ consentVersion: "2020-01-v0" as never }),
      ).success,
    ).toBe(false);
  });
});
