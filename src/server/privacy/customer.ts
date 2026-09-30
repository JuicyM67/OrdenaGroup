import "server-only";

import { withServiceTx } from "@/server/db/tx";

import { isOwnerOrAdmin } from "./authz";
import type { MutationResult } from "./types";

/**
 * Kundens dataskyddsrättigheter (WP-26 steg 2, Ley 21.719/COMPLIANCE.md):
 * export (tillgång/portabilitet) och anonymisering (radering). Körs alltid
 * som `service_role` (D-019): en del av arbetet (avbryta köade outbox-rader,
 * koppla loss `consent_events`) kräver grants som `authenticated` inte har,
 * så hela flödet — INKLUSIVE behörighetskontrollen — görs i en enda
 * `withServiceTx`-transaktion i stället för att lita på RLS (samma mönster
 * som `public.create_business()`: en egen medlemskapskontroll).
 */

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export type CustomerExportData = {
  customer: {
    id: string;
    phoneE164: string | null;
    name: string | null;
    email: string | null;
    notes: string | null;
    visitsCount: number;
    noShowCount: number;
    lastVisitAt: string | null;
    anonymizedAt: string | null;
    createdAt: string;
  };
  bookings: Array<{
    id: string;
    staffId: string;
    serviceId: string;
    status: string;
    periodStart: string;
    periodEnd: string;
    priceClp: number;
    /** Säkerhetsgranskning WP-26 (punkt B1): fritext, kan innehålla persondata. */
    notes: string | null;
    cancelReason: string | null;
    createdAt: string;
  }>;
  bookingAnswers: Array<{
    bookingId: string;
    label: string;
    kind: string;
    value: unknown;
  }>;
  customerAnswers: Array<{
    questionId: string;
    value: unknown;
    updatedAt: string;
  }>;
  consentEvents: Array<{
    subject: string;
    kind: string;
    version: string;
    channel: string;
    granted: boolean;
    createdAt: string;
  }>;
  /** "meddelandestatus utan payload" (planen, steg 2): aldrig `payload`. */
  messages: Array<{
    id: string;
    channel: string;
    template: string;
    status: string;
    sentAt: string | null;
    createdAt: string;
  }>;
};

type CustomerRow = {
  id: string;
  phone_e164: string | null;
  name: string | null;
  email: string | null;
  notes: string | null;
  visits_count: number;
  no_show_count: number;
  last_visit_at: string | null;
  anonymized_at: string | null;
  created_at: string;
};

export type ExportResult =
  { ok: true; data: CustomerExportData } | { ok: false; code: string };

export async function exportCustomer(
  userId: string,
  businessId: string,
  customerId: string,
): Promise<ExportResult> {
  return withServiceTx(async (q) => {
    if (!(await isOwnerOrAdmin(q, userId, businessId))) {
      return { ok: false, code: "unauthorized" };
    }

    const customerRes = await q.query<CustomerRow>(
      `select id, phone_e164, name, email, notes, visits_count, no_show_count,
              last_visit_at, anonymized_at, created_at
         from public.customers
        where business_id = $1 and id = $2`,
      [businessId, customerId],
    );
    const c = customerRes.rows[0];
    if (!c) return { ok: false, code: "not_found" };

    const bookingsRes = await q.query<{
      id: string;
      staff_id: string;
      service_id: string;
      status: string;
      period_start: string;
      period_end: string;
      price_clp: number;
      notes: string | null;
      cancel_reason: string | null;
      created_at: string;
    }>(
      `select id, staff_id, service_id, status,
              lower(period) as period_start, upper(period) as period_end,
              price_clp, notes, cancel_reason, created_at
         from public.bookings
        where business_id = $1 and customer_id = $2
        order by created_at`,
      [businessId, customerId],
    );

    const answersRes = await q.query<{
      booking_id: string;
      label_snapshot: string;
      kind_snapshot: string;
      value: unknown;
    }>(
      `select ba.booking_id, ba.label_snapshot, ba.kind_snapshot, ba.value
         from public.booking_answers ba
         join public.bookings bk on bk.business_id = ba.business_id and bk.id = ba.booking_id
        where ba.business_id = $1 and bk.customer_id = $2
        order by ba.booking_id`,
      [businessId, customerId],
    );

    const customerAnswersRes = await q.query<{
      question_id: string;
      value: unknown;
      updated_at: string;
    }>(
      `select question_id, value, updated_at
         from public.customer_answers
        where business_id = $1 and customer_id = $2`,
      [businessId, customerId],
    );

    const consentRes = await q.query<{
      subject: string;
      kind: string;
      version: string;
      channel: string;
      granted: boolean;
      created_at: string;
    }>(
      `select subject, kind, version, channel, granted, created_at
         from public.consent_events
        where business_id = $1 and customer_id = $2
        order by created_at`,
      [businessId, customerId],
    );

    const messagesRes = await q.query<{
      id: string;
      channel: string;
      template: string;
      status: string;
      sent_at: string | null;
      created_at: string;
    }>(
      `select mo.id, mo.channel, mo.template, mo.status, mo.sent_at, mo.created_at
         from public.message_outbox mo
         join public.bookings bk on bk.business_id = mo.business_id and bk.id = mo.booking_id
        where mo.business_id = $1 and bk.customer_id = $2 and mo.recipient_kind = 'customer'
        order by mo.created_at`,
      [businessId, customerId],
    );

    return {
      ok: true,
      data: {
        customer: {
          id: c.id,
          phoneE164: c.phone_e164,
          name: c.name,
          email: c.email,
          notes: c.notes,
          visitsCount: c.visits_count,
          noShowCount: c.no_show_count,
          lastVisitAt: c.last_visit_at,
          anonymizedAt: c.anonymized_at,
          createdAt: c.created_at,
        },
        bookings: bookingsRes.rows.map((b) => ({
          id: b.id,
          staffId: b.staff_id,
          serviceId: b.service_id,
          status: b.status,
          periodStart: b.period_start,
          periodEnd: b.period_end,
          priceClp: b.price_clp,
          notes: b.notes,
          cancelReason: b.cancel_reason,
          createdAt: b.created_at,
        })),
        bookingAnswers: answersRes.rows.map((a) => ({
          bookingId: a.booking_id,
          label: a.label_snapshot,
          kind: a.kind_snapshot,
          value: a.value,
        })),
        customerAnswers: customerAnswersRes.rows.map((a) => ({
          questionId: a.question_id,
          value: a.value,
          updatedAt: a.updated_at,
        })),
        consentEvents: consentRes.rows.map((e) => ({
          subject: e.subject,
          kind: e.kind,
          version: e.version,
          channel: e.channel,
          granted: e.granted,
          createdAt: e.created_at,
        })),
        messages: messagesRes.rows.map((m) => ({
          id: m.id,
          channel: m.channel,
          template: m.template,
          status: m.status,
          sentAt: m.sent_at,
          createdAt: m.created_at,
        })),
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Anonymisering (D-033-förslaget: radering av kund = anonymisering)
// ---------------------------------------------------------------------------

/**
 * En transaktion (planens krav): nollar persondata + samtycke på
 * `customers` och sätter `anonymized_at`, raderar `customer_answers` och
 * `booking_answers` för kundens bokningar, avbryter köade outbox-rader och
 * tömmer deras payload, rensar `manage_token_hash` på kundens bokningar och
 * kopplar loss `consent_events` (behålls utan koppling till kunden, D-033).
 * Bokningar och belopp (payments) behålls oförändrade — Caja ska kunna visa
 * historik utan persondata.
 */
export async function anonymizeCustomer(
  userId: string,
  businessId: string,
  customerId: string,
): Promise<MutationResult> {
  return withServiceTx(async (q) => {
    if (!(await isOwnerOrAdmin(q, userId, businessId))) {
      return { ok: false, code: "unauthorized" };
    }

    const existing = await q.query(
      `select 1 from public.customers
        where business_id = $1 and id = $2 and anonymized_at is null
        for update`,
      [businessId, customerId],
    );
    if (existing.rows.length === 0) return { ok: false, code: "not_found" };

    await q.query(
      `update public.customers
          set name = null,
              phone_e164 = null,
              email = null,
              notes = null,
              consent_terms_at = null,
              consent_marketing_at = null,
              consent_version = null,
              consent_channel = null,
              anonymized_at = now()
        where business_id = $1 and id = $2`,
      [businessId, customerId],
    );

    await q.query(
      `delete from public.customer_answers
        where business_id = $1 and customer_id = $2`,
      [businessId, customerId],
    );

    await q.query(
      `delete from public.booking_answers ba
        using public.bookings bk
        where ba.business_id = $1
          and ba.booking_id = bk.id
          and bk.business_id = $1
          and bk.customer_id = $2`,
      [businessId, customerId],
    );

    await q.query(
      `update public.message_outbox mo
          set status = 'cancelled', payload = '{}'::jsonb
         from public.bookings bk
        where mo.business_id = $1
          and mo.booking_id = bk.id
          and bk.business_id = $1
          and bk.customer_id = $2
          and mo.status in ('queued', 'failed')`,
      [businessId, customerId],
    );

    // Säkerhetsgranskning WP-26 (punkt B1): notes/cancel_reason är fritext
    // som kan innehålla persondata (se DATA_MODEL.md, bookings).
    await q.query(
      `update public.bookings
          set manage_token_hash = null, notes = null, cancel_reason = null
        where business_id = $1 and customer_id = $2`,
      [businessId, customerId],
    );

    await q.query(
      `update public.consent_events
          set customer_id = null
        where business_id = $1 and customer_id = $2`,
      [businessId, customerId],
    );

    return { ok: true };
  });
}
