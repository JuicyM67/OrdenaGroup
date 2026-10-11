import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * WP-78 (D-059): webhook-routingen på plattformens endpoint. En Checkout-
 * session går till abonnemangen bara när `metadata.kind === "subscription"`
 * (hämtat från API:t), annars till sms-krediterna (D-053) — och tvärtom.
 * Connect-händelser (`account`) rör aldrig abonnemangen.
 */
vi.mock("@/server/db/tx", () => ({
  withServiceTx: async (
    fn: (q: { query: () => Promise<{ rows: unknown[] }> }) => Promise<unknown>,
  ) =>
    fn({
      query: () => Promise.resolve({ rows: [{ event_id: "x" }] }),
    }),
}));

const sessions = new Map<string, Partial<Stripe.Checkout.Session>>();
vi.mock("@/server/payments/stripe/client", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        retrieve: async (id: string) => {
          const s = sessions.get(id);
          if (!s) throw new Error("okänd session");
          return { id, ...s };
        },
      },
    },
  }),
  stripeSecretKey: () => "sk_test_x",
  stripeEnabled: () => true,
  appBaseUrl: () => "http://localhost",
}));

const smsFulfill = vi.fn<(...a: unknown[]) => Promise<unknown>>();
vi.mock("@/server/billing/sms-credits", () => ({
  fulfillSmsCreditCheckout: (...a: unknown[]) => smsFulfill(...a),
  expireSmsCreditCheckout: vi.fn(),
  refundSmsCreditsForCharge: vi.fn(),
  voidSmsCreditsForDispute: vi.fn(),
}));

const sync = vi.fn<(...a: unknown[]) => Promise<unknown>>();
vi.mock("./sync", () => ({
  syncSubscription: (...a: unknown[]) => sync(...a),
  retrieveSubscription: vi.fn(),
  syncFromCheckoutReturn: vi.fn(),
}));

// WP-77: presentkortets gren (först i dispatch) är inte inblandad här.
vi.mock("@/server/gift-cards/webhook", () => ({
  dispatchGiftCardEvent: async () => false,
}));

const connectCompleted = vi.fn<(...a: unknown[]) => Promise<void>>();
vi.mock("@/server/vouchers", () => ({
  handleVoucherCheckoutEvent: async () => false,
  handleVoucherPaymentEvent: async () => false,
}));
vi.mock("@/server/payments/stripe/reconcile", () => ({
  handleCheckoutCompleted: (...a: unknown[]) => connectCompleted(...a),
  handleChargeRefunded: vi.fn(),
  handlePaymentCanceled: vi.fn(),
  reconcileByPaymentIntent: vi.fn(),
}));

const { processStripeEvent } = await import("@/server/payments/stripe/webhook");
const { planForLookupKey, lookupKeyFor } = await import("./config");

function event(
  id: string,
  type: string,
  objectId: string,
  account?: string,
): Stripe.Event {
  return {
    id,
    object: "event",
    type,
    ...(account ? { account } : {}),
    data: { object: { id: objectId } },
  } as unknown as Stripe.Event;
}

beforeEach(() => {
  sessions.clear();
  smsFulfill.mockReset().mockResolvedValue({ status: "ignored" });
  sync.mockReset().mockResolvedValue({ status: "ignored" });
  connectCompleted.mockReset().mockResolvedValue(undefined);
});

describe("webhook-routing (WP-78)", () => {
  it("kind=subscription → abonnemangssynk, inte sms", async () => {
    sessions.set("cs_sub", {
      metadata: { kind: "subscription", business_id: "b1" },
      subscription: "sub_1",
      customer: "cus_1",
      custom_fields: [],
    });
    await processStripeEvent(
      event("evt_a", "checkout.session.completed", "cs_sub"),
      new Date(),
    );
    expect(sync).toHaveBeenCalledWith("sub_1", { eventId: "evt_a" });
    expect(smsFulfill).not.toHaveBeenCalled();
  });

  it("kind=sms_credits → sms-krediter, inte abonnemang", async () => {
    sessions.set("cs_sms", {
      metadata: { kind: "sms_credits", business_id: "b1" },
    });
    await processStripeEvent(
      event("evt_b", "checkout.session.completed", "cs_sms"),
      new Date(),
    );
    expect(smsFulfill).toHaveBeenCalledTimes(1);
    expect(sync).not.toHaveBeenCalled();
  });

  it("customer.subscription.updated → synk via API (payloaden används inte)", async () => {
    await processStripeEvent(
      event("evt_c", "customer.subscription.updated", "sub_9"),
      new Date(),
    );
    expect(sync).toHaveBeenCalledWith("sub_9", { eventId: "evt_c" });
  });

  it("Connect-händelser (account) rör aldrig abonnemangen", async () => {
    await processStripeEvent(
      event("evt_d", "checkout.session.completed", "cs_x", "acct_1"),
      new Date(),
    );
    expect(sync).not.toHaveBeenCalled();
    expect(connectCompleted).toHaveBeenCalledTimes(1);
  });
});

describe("lookup-nycklar", () => {
  it("plan ↔ nyckel, alla versioner; okänd nyckel → null", () => {
    expect(lookupKeyFor("equipo")).toBe("bb_se_equipo_monthly_v1");
    expect(planForLookupKey("bb_se_local_monthly_v3")).toBe("local");
    expect(planForLookupKey("bb_se_custom_monthly_v1")).toBeNull();
    expect(planForLookupKey("price_123")).toBeNull();
    expect(planForLookupKey(null)).toBeNull();
  });
});
