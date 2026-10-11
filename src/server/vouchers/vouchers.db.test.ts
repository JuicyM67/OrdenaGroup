// WP-69 (D-057): integration mot lokal Supabase — sista exemplaret med två
// riktiga anslutningar (ingen översäljning), bokning med värdebevis (rabatt =
// pris, reserverat i samma transaktion), samma värdebevis två gånger, nekad
// förfrågan lämnar tillbaka värdebeviset, besök efter utgången nekas.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Stripe är en fake: "Ångra köp" ska bara testa låsningen mot inlösen (B1),
// svepet för fastnade återbetalningar läser `stripeState` per PaymentIntent
// (okänd PaymentIntent = Stripe svarar inte).
const refunds: string[] = [];
const stripeState = new Map<string, "refunded" | "pending" | "none">();
vi.mock("@/server/payments/stripe/client", () => ({
  stripeEnabled: () => true,
  getStripe: () => ({
    refunds: {
      create: async (p: { payment_intent: string }) => {
        await new Promise((r) => setTimeout(r, 30));
        refunds.push(p.payment_intent);
        return { id: "re_fake" };
      },
      list: async (p: { payment_intent: string }) => {
        const st = stripeState.get(p.payment_intent);
        if (!st) throw new Error("okänd PaymentIntent");
        return { data: st === "pending" ? [{ status: "pending" }] : [] };
      },
    },
    paymentIntents: {
      retrieve: async (id: string) => {
        const st = stripeState.get(id);
        if (!st) throw new Error("okänd PaymentIntent");
        return { latest_charge: { refunded: st === "refunded" } };
      },
    },
  }),
  appBaseUrl: () => "http://localhost",
}));

import {
  fromLocal,
  SANTIAGO,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";
import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  createTestClient,
  createTestUser,
  dropTestBusiness,
  dropTestUser,
  type TestBusiness,
} from "@/server/db/testing";
import { createBooking } from "@/server/bookings/create";
import { moveBooking } from "@/server/bookings/move";

import { withdrawVoucher } from "./account";
import { sweepStuckRefunds } from "./checkout";

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO);
const NOW = at("2026-10-01", "09:00");
const TUE = "2026-10-06";

let biz: TestBusiness;
let buyer: string;
let other: string;
let offerId: string;

async function buyVoucher(userId: string, code: string): Promise<string> {
  const o = await adminQuery<{ order_id: string; currency: string }>(
    `select order_id, currency from private.voucher_open_order($1, $2, 100, 31, $3)`,
    [offerId, userId, NOW],
  );
  const order = o.rows[0]!;
  await adminQuery(
    `update public.voucher_orders set session_id = 'cs_' || id::text where id = $1`,
    [order.order_id],
  );
  const v = await adminQuery<{ voucher_id: string }>(
    `select voucher_id from private.voucher_fulfill($1::uuid, 'cs_' || $1::uuid::text, 'pi_' || $1::uuid::text, 8000, $2, $3, $4)`,
    [order.order_id, order.currency, code, NOW],
  );
  return v.rows[0]!.voucher_id;
}

function book(voucher: { id: string; userId: string }, time = "11:00") {
  return createBooking(
    {
      serviceId: biz.services.corte!,
      staffId: biz.staff.diego!,
      start: at(TUE, time).toISOString(),
      customer: { phone: "+56981112233", name: "Camila Rojas" },
      voucher,
    },
    { businessId: biz.id, actor: { kind: "customer" }, now: NOW },
  );
}

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness({
    services: [{ key: "corte", durationMin: 35, priceClp: 12000 }],
  });
  buyer = await createTestUser();
  other = await createTestUser();
  await adminQuery(
    `insert into public.stripe_accounts (business_id, stripe_account_id, charges_enabled)
     values ($1::uuid, 'acct_db_' || substr($1::text, 1, 8), true)`,
    [biz.id],
  );
  const r = await adminQuery<{ id: string }>(
    `insert into public.offers (business_id, service_id, slug, title, regular_price_minor,
       offer_price_minor, currency, category, status, quantity_total)
     values ($1::uuid, $2, 'vb-' || substr($1::text, 1, 8), 'Corte', 1, 8000, 'CLP', 'har', 'published', 3)
     returning id`,
    [biz.id, biz.services.corte],
  );
  offerId = r.rows[0]!.id;
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await dropTestUser(buyer);
  await dropTestUser(other);
  await closePool();
});

describe("värdebevis (DB)", () => {
  it("sista exemplaret: två samtidiga köp, exakt ett lyckas", async () => {
    await adminQuery(
      `update public.offers set quantity_total = 1, quantity_sold = 0 where id = $1`,
      [offerId],
    );
    const a = await createTestClient();
    const b = await createTestClient();
    try {
      const [ra, rb] = await Promise.all(
        [
          [a, buyer],
          [b, other],
        ].map(async ([c, u]) => {
          const client = c as typeof a;
          await client.query("begin");
          const r = await client.query<{ outcome: string }>(
            `select outcome from private.voucher_open_order($1, $2, 100, 31, $3)`,
            [offerId, u, NOW],
          );
          await new Promise((res) => setTimeout(res, 50));
          await client.query("commit");
          return r.rows[0]!.outcome;
        }),
      );
      expect([ra, rb].sort()).toEqual(["created", "sold_out"]);
    } finally {
      await a.end();
      await b.end();
      await adminQuery(
        `update public.voucher_orders set status = 'expired' where offer_id = $1 and status = 'open'`,
        [offerId],
      );
      await adminQuery(
        `update public.offers set quantity_total = null, quantity_sold = 0 where id = $1`,
        [offerId],
      );
    }
  });

  it("bokning med värdebevis: hela priset betalt, reserverat, inte två gånger", async () => {
    const id = await buyVoucher(buyer, "BB-DB00-0001");
    const r = await book({ id, userId: buyer });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.discountClp).toBe(r.value.priceClp);
    expect(r.value.discountReason).toBe("voucher");
    const v = await adminQuery<{ status: string; booking_id: string }>(
      `select status, booking_id from public.vouchers where id = $1`,
      [id],
    );
    expect(v.rows[0]).toEqual({ status: "reserved", booking_id: r.value.id });

    const again = await book({ id, userId: buyer }, "15:00");
    expect(again.ok).toBe(false);

    // Nekad förfrågan → värdebeviset tillbaka.
    await adminQuery(
      `update public.bookings set status = 'cancelled', cancelled_at = now(),
              cancel_reason = 'declined' where id = $1`,
      [r.value.id],
    );
    const back = await adminQuery<{ status: string }>(
      `select status from public.vouchers where id = $1`,
      [id],
    );
    expect(back.rows[0]?.status).toBe("active");
  });

  it("annans värdebevis eller besök efter utgången nekas", async () => {
    const id = await buyVoucher(buyer, "BB-DB00-0002");
    expect((await book({ id, userId: other }, "12:00")).ok).toBe(false);
    await adminQuery(
      `update public.vouchers set expires_at = $2 where id = $1`,
      [id, at(TUE, "10:00")],
    );
    expect((await book({ id, userId: buyer }, "12:00")).ok).toBe(false);
  });

  it("B1: ångra köp och inlösen samtidigt — bara en lyckas", async () => {
    const id = await buyVoucher(buyer, "BB-DB00-0003");
    refunds.length = 0;
    const [w, b] = await Promise.all([
      withdrawVoucher(buyer, id, NOW),
      book({ id, userId: buyer }, "13:00"),
    ]);
    expect([w.ok, b.ok].filter(Boolean)).toHaveLength(1);
    const v = await adminQuery<{ status: string }>(
      `select status from public.vouchers where id = $1`,
      [id],
    );
    expect(v.rows[0]?.status).toBe(w.ok ? "refunded" : "reserved");
    expect(refunds).toHaveLength(w.ok ? 1 : 0);
    // Efter ett lyckat ångrande går det aldrig att boka.
    if (w.ok)
      expect((await book({ id, userId: buyer }, "14:00")).ok).toBe(false);
  });

  it("S1: återbetalning från Stripe på ett bokat värdebevis gör bokningen obetald", async () => {
    const id = await buyVoucher(buyer, "BB-DB00-0004");
    const r = await book({ id, userId: buyer }, "16:00");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    await adminQuery(
      `select private.voucher_mark_payment(o.payment_intent_id, 'refunded', now())
         from public.vouchers v join public.voucher_orders o on o.id = v.order_id
        where v.id = $1`,
      [id],
    );
    const bk = await adminQuery<{ discount_clp: number }>(
      `select discount_clp from public.bookings where id = $1`,
      [r.value.id],
    );
    expect(bk.rows[0]?.discount_clp).toBe(0);
  });

  it("svep: fastnade i `refunding` → återbetalt, aktivt igen eller nästa pass", async () => {
    const ids = {
      refunded: await buyVoucher(buyer, "BB-DB00-0006"),
      none: await buyVoucher(buyer, "BB-DB00-0007"),
      pending: await buyVoucher(buyer, "BB-DB00-0008"),
    };
    for (const [st, id] of Object.entries(ids)) {
      const r = await adminQuery<{ pi: string }>(
        `update public.vouchers v set status = 'refunding'
           from public.voucher_orders o
          where o.id = v.order_id and v.id = $1
          returning o.payment_intent_id as pi`,
        [id],
      );
      stripeState.set(r.rows[0]!.pi, st as "refunded" | "pending" | "none");
    }
    const status = async () => {
      const r = await adminQuery<{ id: string; status: string }>(
        `select id, status from public.vouchers where id = any($1::uuid[])`,
        [Object.values(ids)],
      );
      return Object.fromEntries(
        Object.entries(ids).map(([k, id]) => [
          k,
          r.rows.find((x) => x.id === id)?.status,
        ]),
      );
    };

    // Yngre än 15 min: rörs inte (ett "Ångra köp" kan pågå).
    await sweepStuckRefunds(new Date());
    expect(await status()).toEqual({
      refunded: "refunding",
      none: "refunding",
      pending: "refunding",
    });

    const later = new Date(Date.now() + 20 * 60_000);
    expect(await sweepStuckRefunds(later)).toBeGreaterThanOrEqual(2);
    const after = {
      refunded: "refunded",
      none: "active",
      pending: "refunding",
    };
    expect(await status()).toEqual(after);
    // Idempotent: ett andra pass ändrar ingenting.
    await sweepStuckRefunds(later);
    expect(await status()).toEqual(after);
    const ref = await adminQuery<{ refunded_at: Date | null }>(
      `select refunded_at from public.vouchers where id = $1`,
      [ids.refunded],
    );
    expect(ref.rows[0]?.refunded_at).not.toBeNull();
  });

  it("S2: en bokning betald med värdebevis kan inte flyttas förbi utgången", async () => {
    const id = await buyVoucher(buyer, "BB-DB00-0005");
    const r = await book({ id, userId: buyer }, "17:00");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    await adminQuery(
      `update public.vouchers set expires_at = $2 where id = $1`,
      [id, at("2026-10-07", "00:00")],
    );
    const moved = await moveBooking(
      {
        bookingId: r.value.id,
        newStart: at("2026-10-07", "11:00").toISOString(),
      },
      {
        businessId: biz.id,
        actor: { kind: "owner", userId: biz.ownerUserId },
        now: NOW,
      },
    );
    expect(moved).toEqual({ ok: false, error: "too_far" });
  });
});
