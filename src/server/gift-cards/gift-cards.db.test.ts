// WP-77 (D-058): integration mot lokal Supabase — samtidig inlösen (saldot
// räcker bara till en), webhook + retursida samtidigt (ett kort), schemalagd
// leverans över sommartid, giltighet (skottdag) och "Ångra köp" (oanvänt,
// 14 dagar i företagets tidszon).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Stripe är en fake: sessionerna slås upp i `sessions`, återbetalningar loggas.
const sessions = new Map<string, Record<string, unknown>>();
const refunds: string[] = [];
vi.mock("@/server/payments/stripe/client", () => ({
  stripeEnabled: () => true,
  getStripe: () => ({
    checkout: {
      sessions: {
        retrieve: async (id: string) => {
          await new Promise((r) => setTimeout(r, 20));
          const s = sessions.get(id);
          if (!s) throw new Error("okänd session");
          return s;
        },
      },
    },
    refunds: {
      create: async (p: { payment_intent: string }) => {
        refunds.push(p.payment_intent);
        return { id: "re_fake" };
      },
    },
  }),
  appBaseUrl: () => "http://localhost",
}));
vi.mock("@/server/messaging/outbox", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  kickOutbox: async () => {},
}));

import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  createTestClient,
  dropTestBusiness,
  type TestBusiness,
} from "@/server/db/testing";

import { createBooking } from "@/server/bookings/create";
import { fromLocal, type LocalDate, type LocalTime } from "@/lib/format/dates";

import { withdrawGiftCard } from "./account";
import { fulfillGiftCardSession } from "./checkout";

let biz: TestBusiness;
const ACCOUNT = `acct_gc_${Math.random().toString(36).slice(2, 10)}`;
let seq = 0;

/** Öppnar en order (som servern) och registrerar en betald fake-session. */
async function openOrder(
  now: Date,
  deliverOn: string | null = null,
): Promise<{ orderId: string; sessionId: string }> {
  const o = await adminQuery<{ order_id: string }>(
    `select order_id from private.gift_card_open_order($1, null, 'Ella', $2,
       'Sara', 'sara@test.invalid', null, 'lilac', $3::date, 50000, 100, 31, $4)`,
    [biz.id, `ella${seq++}@test.invalid`, deliverOn, now],
  );
  const orderId = o.rows[0]!.order_id;
  const sessionId = `cs_gc_${orderId.replace(/-/g, "")}`;
  await adminQuery(
    `update public.gift_card_orders set session_id = $2 where id = $1`,
    [orderId, sessionId],
  );
  sessions.set(sessionId, {
    id: sessionId,
    metadata: { kind: "gift_card", order_id: orderId },
    payment_status: "paid",
    payment_intent: `pi_${orderId}`,
    amount_total: 50000,
    currency: "sek",
  });
  return { orderId, sessionId };
}

async function buy(now: Date, deliverOn: string | null = null) {
  const o = await openOrder(now, deliverOn);
  await fulfillGiftCardSession(o.sessionId, ACCOUNT, now);
  const c = await adminQuery<{ id: string; code: string; expires_at: Date }>(
    `select id, code, expires_at from public.gift_cards where order_id = $1`,
    [o.orderId],
  );
  return { ...o, ...c.rows[0]! };
}

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness();
  await adminQuery(
    `update public.businesses
        set gift_cards_enabled = true, plan = 'emprende', timezone = 'Europe/Stockholm'
      where id = $1`,
    [biz.id],
  );
  await adminQuery(
    `insert into public.stripe_accounts (business_id, stripe_account_id, charges_enabled)
     values ($1, $2, true)`,
    [biz.id, ACCOUNT],
  );
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await closePool();
});

describe("presentkort (DB)", () => {
  it("samtidig inlösen: 500 kr, två à 400 → en lyckas, saldo 100", async () => {
    const card = await buy(new Date("2026-10-11T10:00:00Z"));
    const a = await createTestClient();
    const b = await createTestClient();
    try {
      const outcomes = await Promise.all(
        [a, b].map(async (client) => {
          await client.query("begin");
          const r = await client.query<{ outcome: string }>(
            `select outcome from private.gift_card_redeem_at_till($1, $2, 40000, null, now())`,
            [biz.id, card.code],
          );
          await new Promise((res) => setTimeout(res, 50));
          await client.query("commit");
          return r.rows[0]!.outcome;
        }),
      );
      expect(outcomes.sort()).toEqual(["empty", "redeemed"]);
    } finally {
      await a.end();
      await b.end();
    }
    const g = await adminQuery<{ balance_minor: number }>(
      `select balance_minor from public.gift_cards where id = $1`,
      [card.id],
    );
    expect(g.rows[0]?.balance_minor).toBe(10000);
  });

  it("webhook och retursida samtidigt → ett kort", async () => {
    const now = new Date("2026-10-11T10:00:00Z");
    const o = await openOrder(now);
    const r = await Promise.all([
      fulfillGiftCardSession(o.sessionId, ACCOUNT, now),
      fulfillGiftCardSession(o.sessionId, ACCOUNT, now),
    ]);
    expect(r.sort()).toEqual(["already", "created"]);
    const n = await adminQuery<{ n: number }>(
      `select count(*)::int as n from public.gift_cards where order_id = $1`,
      [o.orderId],
    );
    expect(n.rows[0]?.n).toBe(1);
  });

  it("schemalagd leverans kl. 08:00 lokal tid över sommartid", async () => {
    const now = new Date("2026-10-11T10:00:00Z");
    for (const [day, utc] of [
      ["2026-10-25", "2026-10-25T07:00:00.000Z"],
      ["2027-01-08", "2027-01-08T07:00:00.000Z"],
    ] as const) {
      const c = await buy(now, day);
      const r = await adminQuery<{ next_attempt_at: Date }>(
        `select next_attempt_at from public.message_outbox
          where dedupe_key = $1`,
        [`gift_delivery:${c.id}`],
      );
      expect(r.rows[0]?.next_attempt_at.toISOString()).toBe(utc);
    }
    // Mars (CEST): via databasens funktion (90-dagarsgränsen gäller köpet).
    const m = await adminQuery<{ at: Date }>(
      `select private.gift_card_delivery_at('2027-03-28', 'Europe/Stockholm', $1) as at`,
      [now],
    );
    expect(m.rows[0]?.at.toISOString()).toBe("2027-03-28T06:00:00.000Z");
  });

  it("giltighet: 24 månader t.o.m. samma dag 23:59:59 lokal tid (skottdag)", async () => {
    const leap = await buy(new Date("2028-02-29T10:00:00Z"));
    expect(leap.expires_at.toISOString()).toBe("2030-02-28T22:59:59.000Z");
    const oct = await buy(new Date("2026-10-11T10:00:00Z"));
    expect(oct.expires_at.toISOString()).toBe("2028-10-11T21:59:59.000Z");
  });

  it("ångra köp: nekas efter inlösen; dag 14 23:58 ok, dag 15 00:00 nekas", async () => {
    const bought = new Date("2026-10-11T10:00:00Z");
    const used = await buy(bought);
    await adminQuery(
      `select * from private.gift_card_redeem_at_till($1, $2, 100, null, now())`,
      [biz.id, used.code],
    );
    const owner = (id: string) =>
      adminQuery(`update public.gift_cards set user_id = $2 where id = $1`, [
        id,
        biz.ownerUserId,
      ]);
    await owner(used.id);
    const r1 = await withdrawGiftCard(
      { userId: biz.ownerUserId, cardId: used.id },
      new Date("2026-10-12T10:00:00Z"),
    );
    expect(r1).toEqual({ ok: false, code: "not_allowed" });

    const late = await buy(bought);
    await owner(late.id);
    const r2 = await withdrawGiftCard(
      { userId: biz.ownerUserId, cardId: late.id },
      new Date("2026-10-25T23:00:00Z"), // 26 okt 00:00 CET = dag 15
    );
    expect(r2).toEqual({ ok: false, code: "not_allowed" });

    const ok = await buy(bought);
    await owner(ok.id);
    const r3 = await withdrawGiftCard(
      { userId: biz.ownerUserId, cardId: ok.id },
      new Date("2026-10-25T22:58:00Z"), // 25 okt 23:58 CET = dag 14
    );
    expect(r3).toEqual({ ok: true });
    const g = await adminQuery<{ status: string; balance_minor: number }>(
      `select status, balance_minor from public.gift_cards where id = $1`,
      [ok.id],
    );
    expect(g.rows[0]).toEqual({ status: "refunded", balance_minor: 0 });
    expect(refunds).toContain(`pi_${ok.orderId}`);
  });

  it("bokning med kod: saldot reserveras i bokningen; fel kod → ingen bokning", async () => {
    const now = new Date("2026-10-11T10:00:00Z");
    const card = await buy(now);
    const tz = "Europe/Stockholm" as Parameters<typeof fromLocal>[2];
    const book = (code: string, time: string) =>
      createBooking(
        {
          serviceId: biz.services.corte!,
          staffId: biz.staff.diego!,
          start: fromLocal(
            "2026-10-13" as LocalDate,
            time as LocalTime,
            tz,
          ).toISOString(),
          customer: { phone: "+46701112233", name: "Sara" },
          giftCardCode: code,
        },
        { businessId: biz.id, actor: { kind: "customer" }, now },
      );
    const bad = await book("PK-0000-0000-0000", "11:00");
    expect(bad).toEqual({ ok: false, error: "gift_card_invalid" });
    const r = await book(card.code.toLowerCase().replace(/-/g, " "), "11:00");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.giftCard).toEqual({ heldMinor: 12000, balanceMinor: 38000 });
    expect(r.value.discountClp).toBe(0);
  });
});
