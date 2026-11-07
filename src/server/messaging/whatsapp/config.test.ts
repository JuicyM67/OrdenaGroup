import { describe, expect, it } from "vitest";

import {
  approvedTemplates,
  graphVersion,
  whatsappSendMode,
  whatsappTemplateEnabled,
} from "./config";

describe("whatsappSendMode", () => {
  it("token + nummer-id → live", () => {
    expect(
      whatsappSendMode({
        WHATSAPP_ACCESS_TOKEN: "t",
        WHATSAPP_PHONE_NUMBER_ID: "1",
      }),
    ).toBe("live");
  });

  it("bara det ena → inte live", () => {
    expect(whatsappSendMode({ WHATSAPP_ACCESS_TOKEN: "t" })).toBe("off");
    expect(whatsappSendMode({ WHATSAPP_PHONE_NUMBER_ID: "1" })).toBe("off");
  });

  it("WHATSAPP_FAKE=1 utan nycklar → fake, men aldrig i Vercel production", () => {
    expect(whatsappSendMode({ WHATSAPP_FAKE: "1" })).toBe("fake");
    expect(
      whatsappSendMode({ WHATSAPP_FAKE: "1", VERCEL_ENV: "preview" }),
    ).toBe("fake");
    expect(
      whatsappSendMode({ WHATSAPP_FAKE: "1", VERCEL_ENV: "production" }),
    ).toBe("off");
    expect(whatsappSendMode({ WHATSAPP_FAKE: "true" })).toBe("off");
    expect(whatsappSendMode({})).toBe("off");
  });
});

describe("WHATSAPP_TEMPLATES_APPROVED (den enda konfigurationspunkten)", () => {
  it("tom/saknas → inga mallar", () => {
    expect(approvedTemplates({}).size).toBe(0);
    expect(approvedTemplates({ WHATSAPP_TEMPLATES_APPROVED: "" }).size).toBe(0);
  });

  it("kommaseparerat, blanksteg tål, okända namn ignoreras", () => {
    const set = approvedTemplates({
      WHATSAPP_TEMPLATES_APPROVED:
        " recordatorio_24h , lista_espera_oferta,hora_flash,RESERVA_CONFIRMADA",
    });
    expect([...set].sort()).toEqual([
      "lista_espera_oferta",
      "recordatorio_24h",
    ]);
  });

  it("en mall är påslagen bara om den är godkänd OCH WhatsApp är konfigurerat", () => {
    const approved = { WHATSAPP_TEMPLATES_APPROVED: "recordatorio_24h" };
    expect(whatsappTemplateEnabled("recordatorio_24h", approved)).toBe(false);
    expect(
      whatsappTemplateEnabled("recordatorio_24h", {
        ...approved,
        WHATSAPP_FAKE: "1",
      }),
    ).toBe(true);
    expect(
      whatsappTemplateEnabled("reserva_confirmada", {
        ...approved,
        WHATSAPP_FAKE: "1",
      }),
    ).toBe(false);
  });
});

describe("graphVersion", () => {
  it("standard och giltig override, skräp ignoreras", () => {
    expect(graphVersion({})).toBe("v23.0");
    expect(graphVersion({ WHATSAPP_GRAPH_VERSION: "v24.0" })).toBe("v24.0");
    expect(graphVersion({ WHATSAPP_GRAPH_VERSION: "../x" })).toBe("v23.0");
  });
});
