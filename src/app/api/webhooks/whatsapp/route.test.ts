import { createHmac } from "node:crypto";

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * D-063: `/api/webhooks/whatsapp` — GET-verifieringen (hub.challenge) och
 * POST:s signaturkontroll (X-Hub-Signature-256 över rå body). Själva
 * hanteringen (`processWhatsAppWebhook`) mockas här; den testas mot en
 * riktig databas i `src/server/messaging/whatsapp/webhook.db.test.ts`.
 */
const processMock = vi.fn(async () => ({
  handled: 1,
  duplicates: 0,
  ignored: 0,
  queued: false,
}));
const kickMock = vi.fn(async () => undefined);
vi.mock("@/server/messaging/whatsapp/webhook", () => ({
  processWhatsAppWebhook: (...args: unknown[]) =>
    (processMock as (...a: unknown[]) => unknown)(...args),
}));
vi.mock("@/server/messaging/outbox", () => ({
  kickOutbox: () => kickMock(),
}));

const { GET, POST } = await import("./route");

const SECRET = "app-secret-test";
const VERIFY = "verify-token-test";
const BODY = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [{ changes: [{ field: "messages", value: { statuses: [] } }] }],
});

function sign(body: string, secret = SECRET): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

function post(body: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/webhooks/whatsapp", {
    method: "POST",
    body,
    headers: { "content-type": "application/json", ...headers },
  });
}

function get(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/webhooks/whatsapp?${query}`);
}

let logSpy: ReturnType<typeof vi.spyOn>;
let errSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubEnv("WHATSAPP_APP_SECRET", SECRET);
  vi.stubEnv("WHATSAPP_VERIFY_TOKEN", VERIFY);
  processMock.mockClear();
  kickMock.mockClear();
  logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  logSpy.mockRestore();
  errSpy.mockRestore();
});

describe("GET (verifiering när webhooken registreras i Meta)", () => {
  it("rätt verify token → hub.challenge som text", async () => {
    const res = await GET(
      get(
        `hub.mode=subscribe&hub.verify_token=${VERIFY}&hub.challenge=1158201444`,
      ),
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("1158201444");
    expect(res.headers.get("content-type")).toMatch(/text\/plain/);
  });

  it.each([
    ["fel token", `hub.mode=subscribe&hub.verify_token=fel&hub.challenge=1`],
    ["saknad token", `hub.mode=subscribe&hub.challenge=1`],
    [
      "fel mode",
      `hub.mode=unsubscribe&hub.verify_token=${VERIFY}&hub.challenge=1`,
    ],
    [
      "challenge med html",
      `hub.mode=subscribe&hub.verify_token=${VERIFY}&hub.challenge=%3Cscript%3E`,
    ],
  ])("%s → 403", async (_label, query) => {
    const res = await GET(get(query));
    expect(res.status).toBe(403);
  });

  it("utan WHATSAPP_VERIFY_TOKEN → 403 även med tom token", async () => {
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "");
    const res = await GET(
      get(`hub.mode=subscribe&hub.verify_token=&hub.challenge=1`),
    );
    expect(res.status).toBe(403);
  });
});

describe("POST (signatur före allt annat)", () => {
  it("giltig signatur → 200 och hanteringen körs med parsad body", async () => {
    const res = await POST(post(BODY, { "x-hub-signature-256": sign(BODY) }));
    expect(res.status).toBe(200);
    expect(processMock).toHaveBeenCalledTimes(1);
    expect((processMock.mock.calls[0] as unknown[])[0]).toEqual(
      JSON.parse(BODY),
    );
  });

  it("saknad signatur → 401, ingen hantering", async () => {
    const res = await POST(post(BODY));
    expect(res.status).toBe(401);
    expect(processMock).not.toHaveBeenCalled();
  });

  it("ogiltig signatur (annan hemlighet / ändrad body) → 401, ingen hantering", async () => {
    expect(
      (await POST(post(BODY, { "x-hub-signature-256": sign(BODY, "annan") })))
        .status,
    ).toBe(401);
    expect(
      (await POST(post(`${BODY} `, { "x-hub-signature-256": sign(BODY) })))
        .status,
    ).toBe(401);
    expect(processMock).not.toHaveBeenCalled();
  });

  it("utan WHATSAPP_APP_SECRET → 503 (aldrig osignerat)", async () => {
    vi.stubEnv("WHATSAPP_APP_SECRET", "");
    const res = await POST(
      post(BODY, { "x-hub-signature-256": sign(BODY, "") }),
    );
    expect(res.status).toBe(503);
    expect(processMock).not.toHaveBeenCalled();
  });

  it("för stor body (Content-Length) → 413 innan den läses", async () => {
    const res = await POST(
      post(BODY, {
        "x-hub-signature-256": sign(BODY),
        "content-length": String(2 * 1024 * 1024),
      }),
    );
    expect(res.status).toBe(413);
    expect(processMock).not.toHaveBeenCalled();
  });

  it("signerad men inte JSON → 200 utan hantering (Meta ska inte skicka om)", async () => {
    const raw = "inte json";
    const res = await POST(post(raw, { "x-hub-signature-256": sign(raw) }));
    expect(res.status).toBe(200);
    expect(processMock).not.toHaveBeenCalled();
  });

  it("något köades → kickOutbox", async () => {
    processMock.mockResolvedValueOnce({
      handled: 1,
      duplicates: 0,
      ignored: 0,
      queued: true,
    });
    await POST(post(BODY, { "x-hub-signature-256": sign(BODY) }));
    expect(kickMock).toHaveBeenCalledTimes(1);
  });

  it("hanteringen kastar → 500 (Meta skickar om), loggar bara kod", async () => {
    processMock.mockRejectedValueOnce(
      Object.assign(new Error("+56912345678 detail"), { code: "40001" }),
    );
    const res = await POST(post(BODY, { "x-hub-signature-256": sign(BODY) }));
    expect(res.status).toBe(500);
    const logged = JSON.stringify(errSpy.mock.calls);
    expect(logged).not.toContain("56912345678");
  });

  it("loggar aldrig body, telefon eller hemlighet", async () => {
    const body = JSON.stringify({
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                messages: [{ from: "56912345678", text: { body: "hola" } }],
              },
            },
          ],
        },
      ],
    });
    await POST(post(body, { "x-hub-signature-256": sign(body) }));
    const logged = JSON.stringify([...logSpy.mock.calls, ...errSpy.mock.calls]);
    expect(logged).not.toContain("56912345678");
    expect(logged).not.toContain("hola");
    expect(logged).not.toContain(SECRET);
  });
});
