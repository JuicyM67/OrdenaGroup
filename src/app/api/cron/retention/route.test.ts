import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * WP-26 steg 4: `/api/cron/retention` avvisar fel/saknad `CRON_SECRET`
 * (timing-safe), samma kontroll som `/api/cron/outbox` (D-030). Bara
 * auth-kontrollen testas här (planens tester räcker) — `run_retention`
 * och `purgeBusiness` har egna DB-/enhetstester på annat håll. WP-31:
 * samma princip för `runWinback` (`@/server/campaigns`) — med den mockade
 * `withServiceTx` ovan (tom `rows`) svepet hittar inga företag, så svaret
 * får `winbackBusinesses: 0, winbackQueued: 0`.
 */
const queryMock = vi.fn(async () => ({ rows: [], rowCount: 0 }));
vi.mock("@/server/db/tx", () => ({
  withServiceTx: (fn: (q: { query: typeof queryMock }) => unknown) =>
    fn({ query: queryMock }),
}));

const purgeBusinessMock = vi.fn();
vi.mock("@/server/privacy/business", () => ({
  purgeBusiness: (...args: unknown[]) =>
    (purgeBusinessMock as (...a: unknown[]) => unknown)(...args),
}));

const { GET, POST } = await import("./route");

const ORIGINAL_SECRET = process.env.CRON_SECRET;

function req(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/cron/retention", { headers });
}

beforeEach(() => {
  process.env.CRON_SECRET = "s3cret-value";
  queryMock.mockClear();
  purgeBusinessMock.mockClear();
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL_SECRET;
});

describe("POST /api/cron/retention", () => {
  it("401 utan Authorization-header", async () => {
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(queryMock).not.toHaveBeenCalled();
    expect(purgeBusinessMock).not.toHaveBeenCalled();
  });

  it("401 med fel hemlighet", async () => {
    const res = await POST(req({ authorization: "Bearer nope" }));
    expect(res.status).toBe(401);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("401 med en hemlighet av annan längd (timing-safe utan krasch)", async () => {
    const res = await POST(req({ authorization: "Bearer x" }));
    expect(res.status).toBe(401);
  });

  it("401 om CRON_SECRET saknas i miljön, även med rätt header", async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(req({ authorization: "Bearer s3cret-value" }));
    expect(res.status).toBe(401);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("200 med rätt hemlighet, kör run_retention och svarar med räknarna", async () => {
    const res = await POST(req({ authorization: "Bearer s3cret-value" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown;
    expect(body).toEqual({
      anonymizedCustomers: 0,
      purgedOutbox: 0,
      purgedConsentEvents: 0,
      purgedBusinesses: 0,
      skippedBusinesses: 0,
      winbackBusinesses: 0,
      winbackQueued: 0,
      demoRolled: true,
    });
  });
});

describe("GET /api/cron/retention", () => {
  it("samma auth som POST: 401 utan header, 200 med rätt", async () => {
    expect((await GET(req())).status).toBe(401);
    expect(
      (await GET(req({ authorization: "Bearer s3cret-value" }))).status,
    ).toBe(200);
  });
});
