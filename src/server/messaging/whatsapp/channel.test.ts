import { describe, expect, it } from "vitest";

import { chooseCustomerChannel } from "./channel";
import { isChileanMobile, sameWhatsAppNumber } from "./phone";

const ON = {
  WHATSAPP_FAKE: "1",
  WHATSAPP_TEMPLATES_APPROVED:
    "reserva_confirmada,recordatorio_24h,lista_espera_oferta",
};
const BASE = {
  template: "recordatorio",
  hasEmail: true,
  phone: "+56912345678",
  whatsappConsent: true,
  env: ON,
} as const;

describe("chooseCustomerChannel (D-063)", () => {
  it("allt uppfyllt → whatsapp", () => {
    expect(chooseCustomerChannel(BASE)).toBe("whatsapp");
  });

  it("utan samtycke → e-post (eller inget utan e-post)", () => {
    expect(chooseCustomerChannel({ ...BASE, whatsappConsent: false })).toBe(
      "email",
    );
    expect(
      chooseCustomerChannel({
        ...BASE,
        whatsappConsent: false,
        hasEmail: false,
      }),
    ).toBeNull();
  });

  it("utan e-post men med samtycke → whatsapp (WhatsApp räcker)", () => {
    expect(chooseCustomerChannel({ ...BASE, hasEmail: false })).toBe(
      "whatsapp",
    );
  });

  it.each([null, undefined, "+56223456789", "+5491112345678", "56912345678"])(
    "nummer %s (inte chilenskt mobilnr i E.164) → e-post",
    (phone) => {
      expect(chooseCustomerChannel({ ...BASE, phone })).toBe("email");
    },
  );

  it("WhatsApp inte konfigurerat → e-post", () => {
    expect(
      chooseCustomerChannel({
        ...BASE,
        env: { WHATSAPP_TEMPLATES_APPROVED: ON.WHATSAPP_TEMPLATES_APPROVED },
      }),
    ).toBe("email");
  });

  it("mallen inte godkänd (t.ex. reserva_cancelada utan domän) → e-post", () => {
    expect(
      chooseCustomerChannel({ ...BASE, template: "reservaCancelada" }),
    ).toBe("email");
  });

  it("mall utan WhatsApp-version (t.ex. solicitudRecibida) → e-post", () => {
    expect(
      chooseCustomerChannel({ ...BASE, template: "solicitudRecibida" }),
    ).toBe("email");
  });

  it("redan fallit tillbaka från WhatsApp → e-post", () => {
    expect(chooseCustomerChannel({ ...BASE, whatsappBlocked: true })).toBe(
      "email",
    );
  });
});

describe("telefon", () => {
  it("chilenskt mobilnummer = +569 + 8 siffror", () => {
    expect(isChileanMobile("+56912345678")).toBe(true);
    expect(isChileanMobile("+5691234567")).toBe(false);
    expect(isChileanMobile("+56812345678")).toBe(false);
  });

  it("webhookens from (wa_id) mot kundens E.164", () => {
    expect(sameWhatsAppNumber("56912345678", "+56912345678")).toBe(true);
    expect(sameWhatsAppNumber("56912345679", "+56912345678")).toBe(false);
    expect(sameWhatsAppNumber("+56912345678", "+56912345678")).toBe(false);
    expect(sameWhatsAppNumber(undefined, "+56912345678")).toBe(false);
    expect(sameWhatsAppNumber("56912345678", null)).toBe(false);
  });
});
