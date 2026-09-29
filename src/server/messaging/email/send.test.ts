import { afterEach, describe, expect, it, vi } from "vitest";

import { emailFixtures } from "./fixtures";
import { fakeEmailOutbox, resetFakeEmailOutbox, sendEmail } from "./send";

const NO_ENV = {};
const FULL_ENV = {
  RESEND_API_KEY: "re_test_123",
  EMAIL_FROM_BOOKING: "booking@ordenagroup.cl",
  EMAIL_FROM_ACCOUNT: "administracion@ordenagroup.cl",
};

afterEach(() => {
  resetFakeEmailOutbox();
  vi.unstubAllGlobals();
});

describe("sendEmail", () => {
  it("sin RESEND_API_KEY/EMAIL_FROM_*: usa el fejk, no llama a fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await sendEmail(
      {
        to: "cliente@example.cl",
        template: "magicLink",
        data: emailFixtures("CL").magicLink,
      },
      NO_ENV,
    );

    expect(result.provider).toBe("fake");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(fakeEmailOutbox()).toHaveLength(1);
  });

  it("con env completa: llama a Resend con el remitente correcto según kind", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "re_abc" }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const result = await sendEmail(
      {
        to: "cliente@example.cl",
        template: "reservaConfirmada",
        data: emailFixtures("CL").reservaConfirmada,
        idempotencyKey: "reserva:abc123",
      },
      FULL_ENV,
    );

    expect(result.provider).toBe("resend");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer re_test_123");
    expect(headers["Idempotency-Key"]).toBe("reserva:abc123");
    const body = JSON.parse(init.body as string) as {
      from: string;
      to: string[];
    };
    expect(body.from).toBe("booking@ordenagroup.cl");
    expect(body.to).toEqual(["cliente@example.cl"]);
  });

  it("kind=account usa EMAIL_FROM_ACCOUNT", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "re_abc" }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await sendEmail(
      {
        to: "duena@example.cl",
        template: "bienvenida",
        data: emailFixtures("CL").bienvenida,
      },
      FULL_ENV,
    );

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { from: string };
    expect(body.from).toBe("administracion@ordenagroup.cl");
  });

  it("HTTP no-ok: lanza sin mencionar el destinatario", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 422 }),
    );

    await expect(
      sendEmail(
        {
          to: "cliente@example.cl",
          template: "magicLink",
          data: emailFixtures("CL").magicLink,
        },
        FULL_ENV,
      ),
    ).rejects.toThrow(/422/);
  });

  it("sin RESEND_API_KEY pero con EMAIL_FROM_*: sigue en modo fejk", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await sendEmail(
      {
        to: "a@b.cl",
        template: "magicLink",
        data: emailFixtures("CL").magicLink,
      },
      { EMAIL_FROM_BOOKING: "booking@ordenagroup.cl" },
    );
    expect(result.provider).toBe("fake");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
