import { afterEach, describe, expect, it, vi } from "vitest";

import { smsFixtures } from "./fixtures";
import { fakeSmsOutbox, resetFakeSmsOutbox, sendSms } from "./send";

const NO_ENV = {};
const FULL_ENV = {
  CLICKSEND_USERNAME: "ordena",
  CLICKSEND_API_KEY: "cs_test_123",
};

afterEach(() => {
  resetFakeSmsOutbox();
  vi.unstubAllGlobals();
});

describe("sendSms", () => {
  it("sin CLICKSEND_USERNAME/API_KEY: usa el fejk, no llama a fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await sendSms(
      {
        to: "+56912345678",
        template: "codigoAcceso",
        data: smsFixtures("CL").codigoAcceso,
      },
      NO_ENV,
    );

    expect(result.provider).toBe("fake");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(fakeSmsOutbox()).toHaveLength(1);
  });

  it("solo CLICKSEND_API_KEY (sin username, caso real de bookingbuddy hoy): sigue en fejk", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await sendSms(
      {
        to: "+46701234567",
        template: "codigoAcceso",
        data: smsFixtures("SE").codigoAcceso,
      },
      { CLICKSEND_API_KEY: "cs_test_123" },
    );

    expect(result.provider).toBe("fake");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("con env completa: llama a ClickSend con auth Basic y el body correcto", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ data: { messages: [{ message_id: "cs_abc" }] } }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const result = await sendSms(
      {
        to: "+56912345678",
        template: "reservaConfirmada",
        data: smsFixtures("CL").reservaConfirmada,
        idempotencyKey: "reserva:abc123",
      },
      FULL_ENV,
    );

    expect(result.provider).toBe("clicksend");
    expect(result.id).toBe("cs_abc");
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://rest.clicksend.com/v3/sms/send");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from("ordena:cs_test_123").toString("base64")}`,
    );
    const body = JSON.parse(init.body as string) as {
      messages: { to: string; custom_string?: string; source: string }[];
    };
    expect(body.messages[0]?.to).toBe("+56912345678");
    expect(body.messages[0]?.custom_string).toBe("reserva:abc123");
    expect(body.messages[0]?.source).toBe("sdk");
  });

  it("horaFlash (marketing): agrega la línea de baja (STOP/STOPP)", async () => {
    const result = await sendSms(
      {
        to: "+56912345678",
        template: "horaFlash",
        data: smsFixtures("CL").horaFlash,
      },
      NO_ENV,
    );
    expect(result.text).toMatch(/STOP/i);
  });

  it("codigoAcceso (utility): NO agrega la línea de baja", async () => {
    const result = await sendSms(
      {
        to: "+56912345678",
        template: "codigoAcceso",
        data: smsFixtures("CL").codigoAcceso,
      },
      NO_ENV,
    );
    expect(result.text).not.toMatch(/STOP/i);
  });

  it("HTTP no-ok: lanza sin mencionar el destinatario", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400 }),
    );
    await expect(
      sendSms(
        {
          to: "+56912345678",
          template: "codigoAcceso",
          data: smsFixtures("CL").codigoAcceso,
        },
        FULL_ENV,
      ),
    ).rejects.toThrow(/400/);
  });
});
