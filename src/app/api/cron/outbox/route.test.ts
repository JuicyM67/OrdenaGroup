import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * WP-16 steg 2: `/api/cron/outbox` avvisar fel/saknad `CRON_SECRET`
 * (timing-safe), och kör `processOutbox` bara när den matchar.
 *
 * WP-45 steg 6: samma pass anropar `expireRequests` FÖRE `processOutbox`
 * (`solicitudVencida` ska hinna med i samma körning, se filkommentaren i
 * `route.ts`) — testas här med ett fejkat anropsordning-spår.
 */
const calls: string[] = [];
const processOutboxMock = vi.fn(async () => {
  calls.push("processOutbox");
  return { claimed: 0, sent: 0, cancelled: 0, queued: 0, dead: 0 };
});
const expireRequestsMock = vi.fn(async () => {
  calls.push("expireRequests");
  return [];
});
vi.mock("@/server/messaging/outbox", () => ({
  processOutbox: (...args: unknown[]) =>
    (processOutboxMock as (...a: unknown[]) => unknown)(...args),
}));
vi.mock("@/server/waitlist", () => ({
  expireWaitlistOffers: async () => ({ expired: 0, offered: 0 }),
}));
vi.mock("@/server/reviews/requests", () => ({
  queueReviewRequests: async () => 0,
}));
vi.mock("@/server/bookings/confirm", () => ({
  expireRequests: (...args: unknown[]) =>
    (expireRequestsMock as (...a: unknown[]) => unknown)(...args),
}));

vi.mock("@/server/payments/stripe/reconcile", () => ({
  runStripeSweep: async () => ({ reconciled: 0, sessions: 0 }),
}));

const { GET, POST } = await import("./route");

const ORIGINAL_SECRET = process.env.CRON_SECRET;

function req(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/cron/outbox", { headers });
}

beforeEach(() => {
  process.env.CRON_SECRET = "s3cret-value";
  processOutboxMock.mockClear();
  expireRequestsMock.mockClear();
  calls.length = 0;
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL_SECRET;
});

describe("POST /api/cron/outbox", () => {
  it("401 utan Authorization-header", async () => {
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(processOutboxMock).not.toHaveBeenCalled();
    expect(expireRequestsMock).not.toHaveBeenCalled();
  });

  it("401 med fel hemlighet", async () => {
    const res = await POST(req({ authorization: "Bearer nope" }));
    expect(res.status).toBe(401);
    expect(processOutboxMock).not.toHaveBeenCalled();
    expect(expireRequestsMock).not.toHaveBeenCalled();
  });

  it("401 med en hemlighet av annan längd (timing-safe utan krasch)", async () => {
    const res = await POST(req({ authorization: "Bearer x" }));
    expect(res.status).toBe(401);
  });

  it("401 om CRON_SECRET saknas i miljön, även med rätt header", async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(req({ authorization: "Bearer s3cret-value" }));
    expect(res.status).toBe(401);
    expect(processOutboxMock).not.toHaveBeenCalled();
    expect(expireRequestsMock).not.toHaveBeenCalled();
  });

  it("200 med rätt hemlighet: expireRequests FÖRE processOutbox, svarar med räknarna", async () => {
    const res = await POST(req({ authorization: "Bearer s3cret-value" }));
    expect(res.status).toBe(200);
    expect(expireRequestsMock).toHaveBeenCalledTimes(1);
    expect(processOutboxMock).toHaveBeenCalledExactlyOnceWith({ limit: 50 });
    expect(calls).toEqual(["expireRequests", "processOutbox"]);
    const body = (await res.json()) as unknown;
    expect(body).toEqual({
      claimed: 0,
      sent: 0,
      cancelled: 0,
      queued: 0,
      dead: 0,
      expired: 0,
      waitlistExpired: 0,
      reviewRequests: 0,
      stripe: { reconciled: 0, sessions: 0 },
    });
  });
});

describe("expireRequests kastar", () => {
  it("processOutbox körs ändå; loggen bär bara SQLSTATE", async () => {
    const secret = "leaky detail: +56912345678";
    expireRequestsMock.mockImplementationOnce(async () => {
      calls.push("expireRequests");
      throw Object.assign(new Error(secret), { code: "57014", detail: secret });
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await POST(req({ authorization: "Bearer s3cret-value" }));
      expect(res.status).toBe(200);
      expect(calls).toEqual(["expireRequests", "processOutbox"]);
      expect(((await res.json()) as { expired: number }).expired).toBe(0);
      expect(spy).toHaveBeenCalledExactlyOnceWith(
        "outbox: expireRequests misslyckades",
        { code: "57014" },
      );
      expect(JSON.stringify(spy.mock.calls)).not.toContain("+569");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("GET /api/cron/outbox", () => {
  it("samma auth som POST: 401 utan header, 200 med rätt", async () => {
    expect((await GET(req())).status).toBe(401);
    expect(
      (await GET(req({ authorization: "Bearer s3cret-value" }))).status,
    ).toBe(200);
  });
});
