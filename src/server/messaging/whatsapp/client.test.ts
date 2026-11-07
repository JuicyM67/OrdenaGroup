import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fakeWhatsAppOutbox,
  resetFakeWhatsAppOutbox,
  sendWhatsAppTemplate,
} from "./client";
import { WhatsAppSendError } from "./errors";
import { buildTemplate } from "./templates";

const LIVE = {
  WHATSAPP_ACCESS_TOKEN: "EAAG-test",
  WHATSAPP_PHONE_NUMBER_ID: "1234567890",
};
const TEMPLATE = buildTemplate("recordatorio_24h", {
  negocio: "Barbería Norte",
  cliente: "Joaquín",
  servicio: "Corte",
  fecha: "viernes 2 de octubre",
  hora: "15:00",
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  resetFakeWhatsAppOutbox();
});

describe("sendWhatsAppTemplate", () => {
  it("fake-läget anropar inte Meta och sparar bara maskerat nummer", async () => {
    const fetchSpy = vi.fn();
    const r = await sendWhatsAppTemplate(
      { to: "+56912345678", template: TEMPLATE },
      { WHATSAPP_FAKE: "1" },
      fetchSpy as unknown as typeof fetch,
    );
    expect(r.provider).toBe("fake");
    expect(r.id).toMatch(/^fake_wa_[0-9a-f-]{36}$/);
    expect(fetchSpy).not.toHaveBeenCalled();
    const saved = fakeWhatsAppOutbox();
    expect(saved).toHaveLength(1);
    expect(saved[0]!.toMasked).not.toContain("12345678");
    expect(JSON.stringify(saved)).not.toContain("+56912345678");
  });

  it("inte konfigurerat → permanent fel (utkorgen tar e-post)", async () => {
    await expect(
      sendWhatsAppTemplate({ to: "+56912345678", template: TEMPLATE }, {}),
    ).rejects.toMatchObject({ kind: "permanent", code: "wa_not_configured" });
  });

  it("live: rätt URL, Bearer-token, mallmeddelande till wa_id utan +", async () => {
    const fetchSpy = vi.fn(async () =>
      jsonResponse(200, { messages: [{ id: "wamid.ABC" }] }),
    );
    const r = await sendWhatsAppTemplate(
      { to: "+56912345678", template: TEMPLATE },
      LIVE,
      fetchSpy as unknown as typeof fetch,
    );
    expect(r).toEqual({ provider: "meta", id: "wamid.ABC" });
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://graph.facebook.com/v23.0/1234567890/messages");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer EAAG-test",
    );
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "56912345678",
      type: "template",
      template: TEMPLATE,
    });
  });

  it.each([
    [
      400,
      { error: { code: 131026, message: "Message undeliverable" } },
      "permanent",
      "wa_131026",
    ],
    [400, { error: { code: 132001 } }, "permanent", "wa_132001"],
    [400, { error: { code: 130429 } }, "temporary", "wa_130429"],
    [500, { error: { code: 131000 } }, "temporary", "wa_131000"],
    [503, "inte json", "temporary", "http_503"],
    [401, { error: { code: 190 } }, "permanent", "wa_190"],
  ])("HTTP %d → %s", async (status, body, kind, code) => {
    const fetchSpy = vi.fn(async () =>
      typeof body === "string"
        ? new Response(body, { status })
        : jsonResponse(status, body),
    );
    const p = sendWhatsAppTemplate(
      { to: "+56912345678", template: TEMPLATE },
      LIVE,
      fetchSpy as unknown as typeof fetch,
    );
    await expect(p).rejects.toBeInstanceOf(WhatsAppSendError);
    await expect(p).rejects.toMatchObject({ kind, code });
    // Felet bär aldrig numret eller Metas feltext.
    await p.catch((e: Error) => {
      expect(e.message).not.toContain("56912345678");
      expect(e.message).not.toContain("undeliverable");
    });
  });

  it("nätverksfel → tillfälligt, utan URL i felet", async () => {
    const fetchSpy = vi.fn(async () => {
      throw new TypeError(
        "fetch failed https://graph.facebook.com/…/1234567890",
      );
    });
    const p = sendWhatsAppTemplate(
      { to: "+56912345678", template: TEMPLATE },
      LIVE,
      fetchSpy as unknown as typeof fetch,
    );
    await expect(p).rejects.toMatchObject({
      kind: "temporary",
      code: "wa_network",
    });
    await p.catch((e: Error) => expect(e.message).not.toContain("1234567890"));
  });
});
