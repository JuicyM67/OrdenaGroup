import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  dropTestBusiness,
  insertTestBooking,
  type TestBusiness,
} from "@/server/db/testing";

/**
 * `private.run_retention()` (WP-26 steg 2,
 * supabase/migrations/20260930080100_run_retention.sql): global SQL-funktion,
 * anropas av lagringsjobbet (WP-26 steg 4). Testas direkt via `adminQuery`
 * (ingen TS-wrapper — samma resonemang som `private.owner_emails()`).
 */

let biz: TestBusiness;

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness();
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await closePool();
});

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

describe("private.run_retention(): anonymisering vid 24 månader", () => {
  it("anonymiserar en kund utan bokning på 25 månader, men inte en på 23", async () => {
    const old25 = await adminQuery<{ id: string }>(
      `insert into public.customers (business_id, phone_e164, name, created_at)
       values ($1, '+56922220001', 'Cliente 25m', now() - interval '25 months') returning id`,
      [biz.id],
    );
    const recent23 = await adminQuery<{ id: string }>(
      `insert into public.customers (business_id, phone_e164, name, created_at)
       values ($1, '+56922220002', 'Cliente 23m', now() - interval '23 months') returning id`,
      [biz.id],
    );

    // Gammal bokning (25 mån), ingen ny — ska anonymiseras.
    const staleBooking = await adminQuery<{ id: string }>(
      `insert into public.customers (business_id, phone_e164, name) values ($1, '+56922220003', 'Cliente Bk 25m') returning id`,
      [biz.id],
    );
    await insertTestBooking(biz, {
      start: Date.now() - 25 * MONTH_MS,
      durationMin: 35,
      status: "completed",
      staffKey: "diego",
      customerId: staleBooking.rows[0]!.id,
    });

    // Gammal OCH en ny bokning — ska INTE anonymiseras.
    const active = await adminQuery<{ id: string }>(
      `insert into public.customers (business_id, phone_e164, name) values ($1, '+56922220004', 'Cliente Activo') returning id`,
      [biz.id],
    );
    await insertTestBooking(biz, {
      start: Date.now() - 25 * MONTH_MS,
      durationMin: 35,
      status: "completed",
      staffKey: "matias",
      customerId: active.rows[0]!.id,
    });
    await insertTestBooking(biz, {
      start: Date.now() + 60 * 60_000,
      durationMin: 35,
      staffKey: "matias",
      customerId: active.rows[0]!.id,
    });

    await adminQuery(`select * from private.run_retention()`);

    const ids = [
      old25.rows[0]!.id,
      recent23.rows[0]!.id,
      staleBooking.rows[0]!.id,
      active.rows[0]!.id,
    ];
    const rows = await adminQuery<{ id: string; anonymized_at: string | null }>(
      `select id, anonymized_at from public.customers where id = any($1::uuid[])`,
      [ids],
    );
    const byId = new Map(rows.rows.map((r) => [r.id, r.anonymized_at]));
    expect(byId.get(old25.rows[0]!.id)).not.toBeNull();
    expect(byId.get(recent23.rows[0]!.id)).toBeNull();
    expect(byId.get(staleBooking.rows[0]!.id)).not.toBeNull();
    expect(byId.get(active.rows[0]!.id)).toBeNull();
  });
});

describe("private.run_retention(): utkorgsrader äldre än 90 dagar", () => {
  it("raderar sent/dead/cancelled äldre än 90 dagar, men inte nyare eller köade rader", async () => {
    const bookingId = await insertTestBooking(biz, {
      start: Date.now() + 2 * 60 * 60_000,
      durationMin: 35,
      staffKey: "tomas",
    });
    const oldSent = await adminQuery<{ id: string }>(
      `insert into public.message_outbox
         (business_id, booking_id, channel, recipient_kind, template, category, status, sent_at, dedupe_key)
       values ($1, $2, 'email', 'customer', 'x', 'utility', 'sent', now(), $3) returning id`,
      [biz.id, bookingId, `retention-old:${bookingId}`],
    );
    const recentSent = await adminQuery<{ id: string }>(
      `insert into public.message_outbox
         (business_id, booking_id, channel, recipient_kind, template, category, status, sent_at, dedupe_key)
       values ($1, $2, 'email', 'customer', 'x', 'utility', 'sent', now(), $3) returning id`,
      [biz.id, bookingId, `retention-recent:${bookingId}`],
    );
    const stillQueued = await adminQuery<{ id: string }>(
      `insert into public.message_outbox
         (business_id, booking_id, channel, recipient_kind, template, category, status, dedupe_key)
       values ($1, $2, 'email', 'customer', 'x', 'utility', 'queued', $3) returning id`,
      [biz.id, bookingId, `retention-queued:${bookingId}`],
    );

    // Backdaterar `updated_at` på den gamla raden. Triggern `set_updated_at`
    // skriver annars över varje UPDATE med `now()` — måste stängas av tillfälligt.
    await adminQuery(
      `alter table public.message_outbox disable trigger set_updated_at`,
    );
    await adminQuery(
      `update public.message_outbox set updated_at = now() - interval '91 days' where id = $1`,
      [oldSent.rows[0]!.id],
    );
    await adminQuery(
      `alter table public.message_outbox enable trigger set_updated_at`,
    );

    await adminQuery(`select * from private.run_retention()`);

    const rows = await adminQuery<{ id: string }>(
      `select id from public.message_outbox where id = any($1::uuid[])`,
      [[oldSent.rows[0]!.id, recentSent.rows[0]!.id, stillQueued.rows[0]!.id]],
    );
    const remaining = new Set(rows.rows.map((r) => r.id));
    expect(remaining.has(oldSent.rows[0]!.id)).toBe(false);
    expect(remaining.has(recentSent.rows[0]!.id)).toBe(true);
    expect(remaining.has(stillQueued.rows[0]!.id)).toBe(true);
  });
});
