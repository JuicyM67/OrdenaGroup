// WP-78 (D-059): integration mot lokal Supabase med en FAKE Stripe-klient
// (inga riktiga anrop). Täcker planens fall 1–4: webhook + retursida
// samtidigt, händelser i fel ordning, uppgradering som inte betalats och
// abonnemang vars kund inte är företagets.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

type FakeSub = {
  id: string;
  status: string;
  customer: string;
  metadata: Record<string, string>;
  price: string;
  pending_update: object | null;
};
const subs = new Map<string, FakeSub>();
const canceled: string[] = [];

vi.mock("@/server/payments/stripe/client", () => ({
  stripeSecretKey: () => "sk_test_fake",
  stripeEnabled: () => true,
  appBaseUrl: () => "http://localhost",
  getStripe: () => ({
    subscriptions: {
      retrieve: async (id: string) => {
        const s = subs.get(id);
        if (!s) throw new Error("okänt abonnemang");
        await new Promise((r) => setTimeout(r, 10));
        return {
          id: s.id,
          status: s.status,
          customer: s.customer,
          metadata: s.metadata,
          trial_end: null,
          cancel_at_period_end: false,
          cancel_at: null,
          default_payment_method: null,
          schedule: null,
          pending_update: s.pending_update,
          items: {
            data: [
              {
                id: "si_1",
                current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
                price: { id: `price_${s.price}`, lookup_key: s.price },
              },
            ],
          },
        };
      },
      cancel: async (id: string) => {
        canceled.push(id);
        return { id };
      },
    },
    checkout: {
      sessions: {
        retrieve: async (id: string) => ({
          id,
          metadata: { kind: "subscription", business_id: sessionBiz },
          subscription: "sub_ret",
          customer: "cus_x",
        }),
      },
    },
    invoices: {
      retrieve: async (id: string) => ({
        id,
        status: "paid",
        parent: { subscription_details: { subscription: "sub_order" } },
      }),
    },
  }),
}));

import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  dropTestBusiness,
  type TestBusiness,
} from "@/server/db/testing";

import { handleSubscriptionEvent } from "./events";
import { syncFromCheckoutReturn, syncSubscription } from "./sync";

let a: TestBusiness;
let b: TestBusiness;
let sessionBiz = "";

const cus = (biz: TestBusiness) =>
  `cus_t${biz.id.replace(/-/g, "").slice(0, 12)}`;

async function planOf(biz: TestBusiness): Promise<string> {
  const r = await adminQuery<{ plan: string }>(
    `select plan::text as plan from public.businesses where id = $1`,
    [biz.id],
  );
  return r.rows[0]!.plan;
}

async function changes(biz: TestBusiness): Promise<number> {
  const r = await adminQuery<{ n: number }>(
    `select count(*)::int as n from private.plan_changes where business_id = $1`,
    [biz.id],
  );
  return r.rows[0]!.n;
}

beforeAll(async () => {
  assertLocalDatabase();
  a = await createTestBusiness();
  b = await createTestBusiness();
  for (const biz of [a, b]) {
    await adminQuery(
      `insert into public.billing_subscriptions (business_id, stripe_customer_id) values ($1, $2)`,
      [biz.id, cus(biz)],
    );
  }
});

afterAll(async () => {
  await dropTestBusiness(a);
  await dropTestBusiness(b);
  await closePool();
});

describe("syncSubscription (fake Stripe)", () => {
  it("1. webhook och retursida samtidigt → en planändring", async () => {
    sessionBiz = a.id;
    subs.set("sub_ret", {
      id: "sub_ret",
      status: "trialing",
      customer: cus(a),
      metadata: { kind: "subscription", business_id: a.id },
      price: "bb_se_equipo_monthly_v1",
      pending_update: null,
    });
    const [, ret] = await Promise.all([
      syncSubscription("sub_ret", { eventId: "evt_t1" }),
      syncFromCheckoutReturn("cs_t1", a.id),
    ]);
    expect(ret).toBe("done");
    expect(await planOf(a)).toBe("equipo");
    expect(await changes(a)).toBe(1);
  });

  it("retursidan för ett annat företags session nekas", async () => {
    sessionBiz = a.id;
    expect(await syncFromCheckoutReturn("cs_t2", b.id)).toBe("forbidden");
  });

  it("2. händelser i fel ordning → slutläget följer API:t", async () => {
    subs.set("sub_order", {
      id: "sub_order",
      status: "active",
      customer: cus(b),
      metadata: { kind: "subscription", business_id: b.id },
      price: "bb_se_local_monthly_v1",
      pending_update: null,
    });
    const ev = (id: string, type: string, obj: object) =>
      ({ id, type, object: "event", data: { object: obj } }) as never;
    await handleSubscriptionEvent(ev("evt_o1", "invoice.paid", { id: "in_1" }));
    // Payloaden säger past_due, men API:t säger active.
    await handleSubscriptionEvent(
      ev("evt_o2", "customer.subscription.updated", {
        id: "sub_order",
        status: "past_due",
      }),
    );
    expect(await planOf(b)).toBe("local");
    const r = await adminQuery<{ status: string; grace_until: Date | null }>(
      `select status, grace_until from public.billing_subscriptions where business_id = $1`,
      [b.id],
    );
    expect(r.rows[0]).toMatchObject({ status: "active", grace_until: null });
  });

  it("3. uppgradering som inte betalats (pending_update) → planen oförändrad", async () => {
    // `pending_if_incomplete`: Stripe behåller det gamla priset tills
    // fakturan är betald.
    subs.set("sub_ret", {
      ...subs.get("sub_ret")!,
      status: "active",
      price: "bb_se_equipo_monthly_v1",
      pending_update: { subscription_items: [{ price: "price_local" }] },
    });
    await syncSubscription("sub_ret", { eventId: "evt_t3" });
    expect(await planOf(a)).toBe("equipo");
  });

  it("4. business_id = A men kund = B → fel, ingen ändring", async () => {
    subs.set("sub_bad", {
      id: "sub_bad",
      status: "active",
      customer: cus(b),
      metadata: { kind: "subscription", business_id: a.id },
      price: "bb_se_local_monthly_v1",
      pending_update: null,
    });
    const before = await changes(a);
    await expect(syncSubscription("sub_bad")).rejects.toMatchObject({
      code: "customer_mismatch",
    });
    expect(await planOf(a)).toBe("equipo");
    expect(await changes(a)).toBe(before);
  });

  it("ett andra levande abonnemang för samma företag sägs upp", async () => {
    subs.set("sub_dup", {
      id: "sub_dup",
      status: "active",
      customer: cus(a),
      metadata: { kind: "subscription", business_id: a.id },
      price: "bb_se_local_monthly_v1",
      pending_update: null,
    });
    await expect(syncSubscription("sub_dup")).rejects.toMatchObject({
      code: "duplicate_subscription",
    });
    expect(canceled).toContain("sub_dup");
    expect(await planOf(a)).toBe("equipo");
  });
});
