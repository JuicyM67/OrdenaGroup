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

// WP-69 (D-057): grenvalet — värdebevisets hanterare först, bokningens annars.
const voucherCheckout = vi.fn<(...a: unknown[]) => Promise<boolean>>();
const voucherPayment = vi.fn<(...a: unknown[]) => Promise<boolean>>();
const bookingCompleted = vi.fn<(...a: unknown[]) => Promise<void>>();
const bookingRefunded = vi.fn<(...a: unknown[]) => Promise<void>>();
vi.mock("@/server/vouchers", () => ({
  handleVoucherCheckoutEvent: (...a: unknown[]) => voucherCheckout(...a),
  handleVoucherPaymentEvent: (...a: unknown[]) => voucherPayment(...a),
}));
// WP-77 (D-058): presentkortets gren testas i gift-cards.db.test.ts.
vi.mock("@/server/gift-cards/webhook", () => ({
  dispatchGiftCardEvent: async () => false,
}));
vi.mock("./reconcile", () => ({
  handleCheckoutCompleted: (...a: unknown[]) => bookingCompleted(...a),
  handleChargeRefunded: (...a: unknown[]) => bookingRefunded(...a),
  handlePaymentCanceled: vi.fn(),
  reconcileByPaymentIntent: vi.fn(),
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

describe("processStripeEvent (värdebevis, WP-69)", () => {
  function ev(id: string, type: string, object: Record<string, unknown>) {
    return {
      id,
      object: "event",
      type,
      account: "acct_1",
      data: { object },
    } as unknown as Stripe.Event;
  }

  beforeEach(() => {
    voucherCheckout.mockReset();
    voucherPayment.mockReset();
    bookingCompleted.mockReset();
    bookingRefunded.mockReset();
  });

  it("checkout.session.completed för ett värdebevis hanteras bara av värdebeviset", async () => {
    voucherCheckout.mockResolvedValue(true);
    await processStripeEvent(
      ev("evt_v1", "checkout.session.completed", { id: "cs_1" }),
      new Date(0),
    );
    expect(voucherCheckout).toHaveBeenCalledWith(
      "completed",
      "cs_1",
      "acct_1",
      new Date(0),
    );
    expect(bookingCompleted).not.toHaveBeenCalled();
  });

  it("annars går sessionen till bokningsbetalningen", async () => {
    voucherCheckout.mockResolvedValue(false);
    await processStripeEvent(
      ev("evt_v2", "checkout.session.completed", { id: "cs_2" }),
      new Date(0),
    );
    expect(bookingCompleted).toHaveBeenCalledWith(
      "cs_2",
      "acct_1",
      new Date(0),
    );
  });

  it("charge.refunded: värdebevisets PaymentIntent först", async () => {
    voucherPayment.mockResolvedValue(true);
    await processStripeEvent(
      ev("evt_v3", "charge.refunded", { id: "ch_1", payment_intent: "pi_1" }),
      new Date(0),
    );
    expect(voucherPayment).toHaveBeenCalledWith(
      "refunded",
      "pi_1",
      "acct_1",
      new Date(0),
    );
    expect(bookingRefunded).not.toHaveBeenCalled();
  });
});
