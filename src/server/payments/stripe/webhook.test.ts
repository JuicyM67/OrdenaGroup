import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * WP-64 (D-044): webhook-signaturen verifieras över rå body (fel hemlighet,
 * ändrad body eller saknad header ger ingen händelse) och en händelse hanteras
 * exakt en gång (`inbound_events`, idempotens).
 */
type EventRow = { processedAt: Date | null };
const store = new Map<string, EventRow>();

vi.mock("@/server/db/tx", () => ({
  withServiceTx: async (
    fn: (q: {
      query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
    }) => Promise<unknown>,
  ) =>
    fn({
      query: (sql: string, params: unknown[] = []) => {
        const id = String(params[0]);
        if (sql.includes("insert into public.inbound_events")) {
          if (store.has(id)) return Promise.resolve({ rows: [] });
          store.set(id, { processedAt: null });
          return Promise.resolve({ rows: [{ event_id: id }] });
        }
        if (sql.includes("select processed_at")) {
          const row = store.get(id);
          return Promise.resolve({
            rows: row ? [{ processed_at: row.processedAt }] : [],
          });
        }
        if (sql.includes("set processed_at")) {
          const row = store.get(id);
          if (row) row.processedAt = new Date(0);
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      },
    }),
}));

const { processStripeEvent, verifyStripeEvent } = await import("./webhook");

const SECRET = "whsec_test_primary";
const OTHER = "whsec_test_connect";

function signed(body: string, secret: string): string {
  return Stripe.webhooks.generateTestHeaderString({ payload: body, secret });
}

const body = JSON.stringify({
  id: "evt_1",
  object: "event",
  type: "customer.created",
  account: "acct_1",
  data: { object: { id: "cus_1" } },
});

beforeEach(() => store.clear());

describe("verifyStripeEvent", () => {
  it("godtar en korrekt signatur", () => {
    const e = verifyStripeEvent(body, signed(body, SECRET), [SECRET]);
    expect(e?.id).toBe("evt_1");
  });

  it("provar varje hemlighet (plattform + Connect)", () => {
    const e = verifyStripeEvent(body, signed(body, OTHER), [SECRET, OTHER]);
    expect(e?.id).toBe("evt_1");
  });

  it("avvisar fel hemlighet", () => {
    expect(
      verifyStripeEvent(body, signed(body, "whsec_x"), [SECRET]),
    ).toBeNull();
  });

  it("avvisar en ändrad body (signatur över rå body)", () => {
    const header = signed(body, SECRET);
    expect(verifyStripeEvent(body + " ", header, [SECRET])).toBeNull();
  });

  it("avvisar en skräp-header", () => {
    expect(verifyStripeEvent(body, "t=1,v1=abc", [SECRET])).toBeNull();
  });
});

describe("processStripeEvent (idempotens)", () => {
  const event = JSON.parse(body) as Stripe.Event;

  it("hanterar en händelse en gång och ignorerar dubbletter", async () => {
    expect(await processStripeEvent(event, new Date(0))).toBe("handled");
    expect(await processStripeEvent(event, new Date(0))).toBe("duplicate");
  });

  it("hanterar en sparad men ofärdig händelse igen (tidigare försök föll)", async () => {
    store.set("evt_1", { processedAt: null });
    expect(await processStripeEvent(event, new Date(0))).toBe("handled");
  });
});
