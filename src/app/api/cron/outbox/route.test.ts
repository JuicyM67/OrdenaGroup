import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * WP-16 steg 2: `/api/cron/outbox` avvisar fel/saknad `CRON_SECRET`
 * (timing-safe), och kör `processOutbox` bara när den matchar.
 */
const processOutboxMock = vi.fn(async () => ({
  claimed: 0,
  sent: 0,
  cancelled: 0,
  queued: 0,
  dead: 0,
}));
vi.mock("@/server/messaging/outbox", () => ({
  processOutbox: (...args: unknown[]) =>
    (processOutboxMock as (...a: unknown[]) => unknown)(...args),
}));

const { GET, POST } = await import("./route");

const ORIGINAL_SECRET = process.env.CRON_SECRET;

function req(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/cron/outbox", { headers });
}

beforeEach(() => {
  process.env.CRON_SECRET = "s3cret-value";
  processOutboxMock.mockClear();
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
  });

  it("401 med fel hemlighet", async () => {
    const res = await POST(req({ authorization: "Bearer nope" }));
    expect(res.status).toBe(401);
    expect(processOutboxMock).not.toHaveBeenCalled();
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
  });

  it("200 med rätt hemlighet, kör processOutbox och svarar med räknarna", async () => {
    const res = await POST(req({ authorization: "Bearer s3cret-value" }));
    expect(res.status).toBe(200);
    expect(processOutboxMock).toHaveBeenCalledExactlyOnceWith({ limit: 50 });
    const body = (await res.json()) as unknown;
    expect(body).toEqual({
      claimed: 0,
      sent: 0,
      cancelled: 0,
      queued: 0,
      dead: 0,
    });
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
