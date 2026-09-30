import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  createTestUser,
  dropTestBusiness,
  dropTestUser,
  insertTestBooking,
  type TestBusiness,
} from "@/server/db/testing";

import { anonymizeCustomer, exportCustomer } from "./customer";

let biz: TestBusiness;
let other: TestBusiness;

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness();
  other = await createTestBusiness();
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await dropTestBusiness(other);
  await closePool();
});

async function insertConsentEvent(businessId: string, customerId: string) {
  const r = await adminQuery<{ id: string }>(
    `insert into public.consent_events (business_id, customer_id, subject, kind, version, channel, granted)
     values ($1, $2, 'customer', 'terms', '2026-10-v1', 'web', true) returning id`,
    [businessId, customerId],
  );
  return r.rows[0]!.id;
}

describe("exportCustomer (WP-26 steg 2)", () => {
  it("innehåller bara det egna företagets data (kund, bokning, samtycke)", async () => {
    const phone = "+56911110001";
    const c = await adminQuery<{ id: string }>(
      `insert into public.customers (business_id, phone_e164, name) values ($1, $2, 'Cliente Export') returning id`,
      [biz.id, phone],
    );
    const customerId = c.rows[0]!.id;
    const bookingId = await insertTestBooking(biz, {
      start: Date.now() + 60 * 60_000,
      durationMin: 35,
      staffKey: "diego",
      customerId,
    });
    await adminQuery(
      `update public.bookings set notes = 'Alérgico al níquel' where id = $1`,
      [bookingId],
    );
    await insertConsentEvent(biz.id, customerId);

    const r = await exportCustomer(biz.ownerUserId, biz.id, customerId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.customer.phoneE164).toBe(phone);
    expect(r.data.bookings.map((b) => b.id)).toEqual([bookingId]);
    // Säkerhetsgranskning WP-26 (punkt B1): notes/cancel_reason ingår i exporten.
    expect(r.data.bookings[0]?.notes).toBe("Alérgico al níquel");
    expect(r.data.consentEvents).toHaveLength(1);
    expect(r.data.consentEvents[0]?.kind).toBe("terms");
  });

  it("en ägare i ett annat företag får unauthorized", async () => {
    const c = await adminQuery<{ id: string }>(
      `insert into public.customers (business_id, phone_e164, name) values ($1, '+56911110002', 'Cliente B') returning id`,
      [biz.id],
    );
    const r = await exportCustomer(other.ownerUserId, biz.id, c.rows[0]!.id);
    expect(r).toEqual({ ok: false, code: "unauthorized" });
  });

  it("okänd kund ger not_found", async () => {
    const r = await exportCustomer(
      biz.ownerUserId,
      biz.id,
      "00000000-0000-0000-0000-000000000000",
    );
    expect(r).toEqual({ ok: false, code: "not_found" });
  });
});

describe("anonymizeCustomer (WP-26 steg 2, D-033)", () => {
  it("nollar persondata, raderar svar, avbryter köad outbox och kopplar loss samtyckesloggen", async () => {
    const phone = "+56911110003";
    const c = await adminQuery<{ id: string }>(
      `insert into public.customers (business_id, phone_e164, name, email, notes)
       values ($1, $2, 'Cliente Anon', 'anon@example.com', 'nota privada') returning id`,
      [biz.id, phone],
    );
    const customerId = c.rows[0]!.id;
    const bookingId = await insertTestBooking(biz, {
      start: Date.now() + 60 * 60_000,
      durationMin: 35,
      staffKey: "matias",
      customerId,
    });
    await adminQuery(
      `update public.bookings
          set manage_token_hash = decode(repeat('ab', 32), 'hex'),
              notes = 'Prefiere corte a máquina, alérgico a la lavanda',
              cancel_reason = 'Canceló por enfermedad'
        where id = $1`,
      [bookingId],
    );

    const q = await adminQuery<{ id: string }>(
      `insert into public.booking_questions (business_id, label, kind, applies_to, save_to_customer)
       values ($1, 'Alergias', 'short_text', 'all', true) returning id`,
      [biz.id],
    );
    const questionId = q.rows[0]!.id;
    await adminQuery(
      `insert into public.booking_answers (business_id, booking_id, question_id, label_snapshot, kind_snapshot, value)
       values ($1, $2, $3, 'Alergias', 'short_text', '"ninguna"'::jsonb)`,
      [biz.id, bookingId, questionId],
    );
    await adminQuery(
      `insert into public.customer_answers (business_id, customer_id, question_id, value)
       values ($1, $2, $3, '"ninguna"'::jsonb)`,
      [biz.id, customerId, questionId],
    );

    await adminQuery(
      `insert into public.message_outbox
         (business_id, booking_id, channel, recipient_kind, template, payload, category, status, dedupe_key)
       values ($1, $2, 'email', 'customer', 'reservaConfirmada', jsonb_build_object('token', 'secreto'), 'utility', 'queued', $3)`,
      [biz.id, bookingId, `anon-test:${bookingId}`],
    );
    // Säkerhetsgranskning WP-26 (punkt 8): samma statuslista som
    // cancelPendingReminders (enqueue.ts) — 'failed' ska avbrytas också, inte
    // bara 'queued'.
    await adminQuery(
      `insert into public.message_outbox
         (business_id, booking_id, channel, recipient_kind, template, payload, category, status, attempts, dedupe_key)
       values ($1, $2, 'email', 'customer', 'recordatorio', jsonb_build_object('token', 'secreto2'), 'utility', 'failed', 3, $3)`,
      [biz.id, bookingId, `anon-test-failed:${bookingId}`],
    );

    const consentId = await insertConsentEvent(biz.id, customerId);

    const result = await anonymizeCustomer(biz.ownerUserId, biz.id, customerId);
    expect(result).toEqual({ ok: true });

    const customerRow = await adminQuery<{
      name: string | null;
      phone_e164: string | null;
      email: string | null;
      notes: string | null;
      consent_terms_at: string | null;
      anonymized_at: string | null;
    }>(
      `select name, phone_e164, email, notes, consent_terms_at, anonymized_at
         from public.customers where id = $1`,
      [customerId],
    );
    const row = customerRow.rows[0]!;
    expect(row.name).toBeNull();
    expect(row.phone_e164).toBeNull();
    expect(row.email).toBeNull();
    expect(row.notes).toBeNull();
    expect(row.consent_terms_at).toBeNull();
    expect(row.anonymized_at).not.toBeNull();

    const answers = await adminQuery(
      `select 1 from public.customer_answers where customer_id = $1`,
      [customerId],
    );
    expect(answers.rowCount).toBe(0);

    const bookingAnswers = await adminQuery(
      `select 1 from public.booking_answers where booking_id = $1`,
      [bookingId],
    );
    expect(bookingAnswers.rowCount).toBe(0);

    const outbox = await adminQuery<{ status: string; payload: unknown }>(
      `select status, payload from public.message_outbox where booking_id = $1 order by template`,
      [bookingId],
    );
    expect(outbox.rows).toHaveLength(2);
    for (const row of outbox.rows) {
      expect(row.status).toBe("cancelled");
      expect(row.payload).toEqual({});
    }

    const tokenRow = await adminQuery<{
      manage_token_hash: unknown;
      notes: string | null;
      cancel_reason: string | null;
    }>(
      `select manage_token_hash, notes, cancel_reason from public.bookings where id = $1`,
      [bookingId],
    );
    expect(tokenRow.rows[0]?.manage_token_hash).toBeNull();
    // Säkerhetsgranskning WP-26 (punkt B1): fritext på bokningen, kan
    // innehålla persondata.
    expect(tokenRow.rows[0]?.notes).toBeNull();
    expect(tokenRow.rows[0]?.cancel_reason).toBeNull();

    const consent = await adminQuery<{ customer_id: string | null }>(
      `select customer_id from public.consent_events where id = $1`,
      [consentId],
    );
    expect(consent.rows[0]?.customer_id).toBeNull();

    // Telefonnumret blir fritt: en ny kund kan bokas med samma nummer.
    const reused = await adminQuery(
      `insert into public.customers (business_id, phone_e164, name) values ($1, $2, 'Nuevo Cliente') returning id`,
      [biz.id, phone],
    );
    expect(reused.rowCount).toBe(1);
  });

  it("andra företags kunder rörs inte", async () => {
    const otherCustomer = await adminQuery<{ id: string; name: string }>(
      `insert into public.customers (business_id, phone_e164, name) values ($1, '+56911110004', 'Cliente Otro') returning id, name`,
      [other.id],
    );
    const otherCustomerId = otherCustomer.rows[0]!.id;

    const c = await adminQuery<{ id: string }>(
      `insert into public.customers (business_id, phone_e164, name) values ($1, '+56911110005', 'Cliente Propio') returning id`,
      [biz.id],
    );
    const result = await anonymizeCustomer(biz.ownerUserId, biz.id, c.rows[0]!.id);
    expect(result).toEqual({ ok: true });

    const untouched = await adminQuery<{ name: string }>(
      `select name from public.customers where id = $1`,
      [otherCustomerId],
    );
    expect(untouched.rows[0]?.name).toBe("Cliente Otro");
  });

  it("en ägare i ett annat företag får unauthorized, och rör ingenting", async () => {
    const c = await adminQuery<{ id: string }>(
      `insert into public.customers (business_id, phone_e164, name) values ($1, '+56911110006', 'Cliente Intacto') returning id`,
      [biz.id],
    );
    const customerId = c.rows[0]!.id;
    const result = await anonymizeCustomer(other.ownerUserId, biz.id, customerId);
    expect(result).toEqual({ ok: false, code: "unauthorized" });

    const untouched = await adminQuery<{ name: string | null }>(
      `select name from public.customers where id = $1`,
      [customerId],
    );
    expect(untouched.rows[0]?.name).toBe("Cliente Intacto");
  });

  it("en redan anonymiserad kund ger not_found (inte dubbel anonymisering)", async () => {
    const c = await adminQuery<{ id: string }>(
      `insert into public.customers (business_id, phone_e164, name, anonymized_at)
       values ($1, null, null, now()) returning id`,
      [biz.id],
    );
    const result = await anonymizeCustomer(biz.ownerUserId, biz.id, c.rows[0]!.id);
    expect(result).toEqual({ ok: false, code: "not_found" });
  });
});

describe("Säkerhetsgranskning WP-26 (punkt 11): staff-medlem i samma företag", () => {
  it("en staff-medlem får unauthorized på export och anonymisering av en kund", async () => {
    const staffUserId = await createTestUser();
    await adminQuery(
      `insert into public.memberships (business_id, user_id, role) values ($1, $2, 'staff')`,
      [biz.id, staffUserId],
    );
    try {
      const c = await adminQuery<{ id: string }>(
        `insert into public.customers (business_id, phone_e164, name) values ($1, '+56911110007', 'Cliente Staff Test') returning id`,
        [biz.id],
      );
      const customerId = c.rows[0]!.id;
      expect(await exportCustomer(staffUserId, biz.id, customerId)).toEqual({
        ok: false,
        code: "unauthorized",
      });
      expect(await anonymizeCustomer(staffUserId, biz.id, customerId)).toEqual({
        ok: false,
        code: "unauthorized",
      });
      const untouched = await adminQuery<{ name: string | null }>(
        `select name from public.customers where id = $1`,
        [customerId],
      );
      expect(untouched.rows[0]?.name).toBe("Cliente Staff Test");
    } finally {
      await adminQuery(
        `delete from public.memberships where business_id = $1 and user_id = $2`,
        [biz.id, staffUserId],
      );
      await dropTestUser(staffUserId);
    }
  });
});
