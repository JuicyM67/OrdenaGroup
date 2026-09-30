import "server-only";

import type { Queryable } from "@/server/db/pool";
import { getStorageAdminClient } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";

import { isOwner, isOwnerOrAdmin } from "./authz";
import type { MutationResult } from "./types";

/**
 * Företagets dataskyddsrättigheter (WP-26 steg 3): export, och en
 * livscykel för kontoradering med 30 dagars ångerfrist (ägarens svar
 * 2026-09-30):
 *
 *   requestBusinessDeletion → status = 'frozen' (bokningssidan offline,
 *     src/components/booking/booking-screen.tsx) + deletion_requested_at = nu.
 *   cancelBusinessDeletion  → återställer status = 'active', nollar fältet,
 *     bara inom fristen (medan deletion_requested_at fortfarande är satt).
 *   purgeBusiness           → själva raderingen. Anropas INTE av ägaren
 *     direkt, utan av lagringsjobbet (WP-26 steg 4, integrations-engineer)
 *     när fristen gått ut. Oåterkallelig.
 *
 * Alla fyra kör som `service_role` och gör sin egen medlemskapskontroll i
 * stället för att lita på RLS — `businesses.status`/`deletion_requested_at`
 * kan bara ändras av service_role (B2), och `purgeBusiness` har ingen
 * inloggad användare alls (cron, CRON_SECRET).
 *
 * Säkerhetsgranskning WP-26 (punkt 2): `exportBusiness`,
 * `requestBusinessDeletion` och `cancelBusinessDeletion` är beslut på
 * ägarnivå — bara rollen `owner` (`isOwner`), INTE `admin` (företagsnivå-
 * rollen, se DATA_MODEL.md). `getBusinessDeletionStatus` (bara läsning) och
 * kundexport/-anonymisering (`customer.ts`) förblir `owner`-ELLER-`admin`.
 */

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export type BusinessExportData = {
  business: {
    id: string;
    slug: string;
    name: string;
    comuna: string;
    category: string;
    phone: string | null;
    address: string | null;
    /** Säkerhetsgranskning WP-26 (punkt 7): bild-URL:er. */
    logoUrl: string | null;
    coverUrl: string | null;
    createdAt: string;
  };
  staff: Array<{
    id: string;
    name: string;
    title: string | null;
    active: boolean;
    photoUrl: string | null;
  }>;
  services: Array<{
    id: string;
    name: string;
    durationMin: number;
    priceClp: number;
    active: boolean;
  }>;
  /** WP-26 punkt 7. */
  businessHours: Array<{ weekday: number; start: string; end: string }>;
  customers: Array<{
    id: string;
    phoneE164: string | null;
    name: string | null;
    email: string | null;
    /** Fritext, kan innehålla persondata. */
    notes: string | null;
    anonymizedAt: string | null;
    createdAt: string;
  }>;
  bookings: Array<{
    id: string;
    staffId: string;
    serviceId: string;
    customerId: string;
    status: string;
    periodStart: string;
    periodEnd: string;
    priceClp: number;
    notes: string | null;
    cancelReason: string | null;
  }>;
  /** WP-26 punkt 7: hela företagets svar, inte bara en kunds (customer.ts). */
  bookingAnswers: Array<{
    bookingId: string;
    label: string;
    kind: string;
    value: unknown;
  }>;
  customerAnswers: Array<{
    customerId: string;
    questionId: string;
    value: unknown;
    updatedAt: string;
  }>;
  /** WP-26 punkt 7. */
  payments: Array<{
    id: string;
    bookingId: string;
    kind: string;
    method: string;
    amountClp: number;
    status: string;
    paidAt: string | null;
  }>;
  /** WP-26 punkt 7: galleriets bildsökvägar (business-media/<bid>/…). */
  images: Array<{ path: string; sort: number }>;
  consentEvents: Array<{
    customerId: string | null;
    subject: string;
    kind: string;
    version: string;
    channel: string;
    granted: boolean;
    createdAt: string;
  }>;
};

export type ExportBusinessResult =
  | { ok: true; data: BusinessExportData }
  | { ok: false; code: string };

export async function exportBusiness(
  userId: string,
  businessId: string,
): Promise<ExportBusinessResult> {
  return withServiceTx(async (q) => {
    if (!(await isOwner(q, userId, businessId))) {
      return { ok: false, code: "unauthorized" };
    }

    const businessRes = await q.query<{
      id: string;
      slug: string;
      name: string;
      comuna: string;
      category: string;
      phone: string | null;
      address: string | null;
      logo_url: string | null;
      cover_url: string | null;
      created_at: string;
    }>(
      `select id, slug, name, comuna, category, phone, address, logo_url, cover_url, created_at
         from public.businesses where id = $1`,
      [businessId],
    );
    const business = businessRes.rows[0];
    if (!business) return { ok: false, code: "not_found" };

    const staffRes = await q.query<{
      id: string;
      name: string;
      title: string | null;
      active: boolean;
      photo_url: string | null;
    }>(
      `select id, name, title, active, photo_url from public.staff
        where business_id = $1 order by sort`,
      [businessId],
    );

    const servicesRes = await q.query<{
      id: string;
      name: string;
      duration_min: number;
      price_clp: number;
      active: boolean;
    }>(
      `select id, name, duration_min, price_clp, active from public.services
        where business_id = $1 order by sort`,
      [businessId],
    );

    const hoursRes = await q.query<{
      weekday: number;
      start_time: string;
      end_time: string;
    }>(
      `select weekday, start_time, end_time from public.business_hours
        where business_id = $1 order by weekday, start_time`,
      [businessId],
    );

    const customersRes = await q.query<{
      id: string;
      phone_e164: string | null;
      name: string | null;
      email: string | null;
      notes: string | null;
      anonymized_at: string | null;
      created_at: string;
    }>(
      `select id, phone_e164, name, email, notes, anonymized_at, created_at
         from public.customers where business_id = $1 order by created_at`,
      [businessId],
    );

    const bookingsRes = await q.query<{
      id: string;
      staff_id: string;
      service_id: string;
      customer_id: string;
      status: string;
      period_start: string;
      period_end: string;
      price_clp: number;
      notes: string | null;
      cancel_reason: string | null;
    }>(
      `select id, staff_id, service_id, customer_id, status,
              lower(period) as period_start, upper(period) as period_end,
              price_clp, notes, cancel_reason
         from public.bookings where business_id = $1 order by created_at`,
      [businessId],
    );

    const bookingAnswersRes = await q.query<{
      booking_id: string;
      label_snapshot: string;
      kind_snapshot: string;
      value: unknown;
    }>(
      `select booking_id, label_snapshot, kind_snapshot, value
         from public.booking_answers where business_id = $1
        order by booking_id`,
      [businessId],
    );

    const customerAnswersRes = await q.query<{
      customer_id: string;
      question_id: string;
      value: unknown;
      updated_at: string;
    }>(
      `select customer_id, question_id, value, updated_at
         from public.customer_answers where business_id = $1
        order by customer_id`,
      [businessId],
    );

    const paymentsRes = await q.query<{
      id: string;
      booking_id: string;
      kind: string;
      method: string;
      amount_clp: number;
      status: string;
      paid_at: string | null;
    }>(
      `select id, booking_id, kind, method, amount_clp, status, paid_at
         from public.payments where business_id = $1 order by created_at`,
      [businessId],
    );

    const imagesRes = await q.query<{ path: string; sort: number }>(
      `select path, sort from public.business_images
        where business_id = $1 order by sort`,
      [businessId],
    );

    const consentRes = await q.query<{
      customer_id: string | null;
      subject: string;
      kind: string;
      version: string;
      channel: string;
      granted: boolean;
      created_at: string;
    }>(
      `select customer_id, subject, kind, version, channel, granted, created_at
         from public.consent_events where business_id = $1 order by created_at`,
      [businessId],
    );

    return {
      ok: true,
      data: {
        business: {
          id: business.id,
          slug: business.slug,
          name: business.name,
          comuna: business.comuna,
          category: business.category,
          phone: business.phone,
          address: business.address,
          logoUrl: business.logo_url,
          coverUrl: business.cover_url,
          createdAt: business.created_at,
        },
        staff: staffRes.rows.map((s) => ({
          id: s.id,
          name: s.name,
          title: s.title,
          active: s.active,
          photoUrl: s.photo_url,
        })),
        services: servicesRes.rows.map((s) => ({
          id: s.id,
          name: s.name,
          durationMin: s.duration_min,
          priceClp: s.price_clp,
          active: s.active,
        })),
        businessHours: hoursRes.rows.map((h) => ({
          weekday: h.weekday,
          start: h.start_time,
          end: h.end_time,
        })),
        customers: customersRes.rows.map((c) => ({
          id: c.id,
          phoneE164: c.phone_e164,
          name: c.name,
          email: c.email,
          notes: c.notes,
          anonymizedAt: c.anonymized_at,
          createdAt: c.created_at,
        })),
        bookings: bookingsRes.rows.map((b) => ({
          id: b.id,
          staffId: b.staff_id,
          serviceId: b.service_id,
          customerId: b.customer_id,
          status: b.status,
          periodStart: b.period_start,
          periodEnd: b.period_end,
          priceClp: b.price_clp,
          notes: b.notes,
          cancelReason: b.cancel_reason,
        })),
        bookingAnswers: bookingAnswersRes.rows.map((a) => ({
          bookingId: a.booking_id,
          label: a.label_snapshot,
          kind: a.kind_snapshot,
          value: a.value,
        })),
        customerAnswers: customerAnswersRes.rows.map((a) => ({
          customerId: a.customer_id,
          questionId: a.question_id,
          value: a.value,
          updatedAt: a.updated_at,
        })),
        payments: paymentsRes.rows.map((p) => ({
          id: p.id,
          bookingId: p.booking_id,
          kind: p.kind,
          method: p.method,
          amountClp: p.amount_clp,
          status: p.status,
          paidAt: p.paid_at,
        })),
        images: imagesRes.rows.map((i) => ({ path: i.path, sort: i.sort })),
        consentEvents: consentRes.rows.map((e) => ({
          customerId: e.customer_id,
          subject: e.subject,
          kind: e.kind,
          version: e.version,
          channel: e.channel,
          granted: e.granted,
          createdAt: e.created_at,
        })),
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Kontoradering: 30 dagars ångerfrist
// ---------------------------------------------------------------------------

export type DeletionStatusResult =
  | { ok: true; deletionRequestedAt: string | null }
  | { ok: false; code: string };

/** Läser bara `deletion_requested_at` (Ajustes: "Privacidad y datos", WP-26
 * steg 7) — ingen egen mutation, `owner`-ELLER-`admin` (bara läsning, till
 * skillnad från request/cancel/export nedan). */
export async function getBusinessDeletionStatus(
  userId: string,
  businessId: string,
): Promise<DeletionStatusResult> {
  return withServiceTx(async (q) => {
    if (!(await isOwnerOrAdmin(q, userId, businessId))) {
      return { ok: false, code: "unauthorized" };
    }
    const r = await q.query<{ deletion_requested_at: string | null }>(
      `select deletion_requested_at from public.businesses where id = $1`,
      [businessId],
    );
    const row = r.rows[0];
    if (!row) return { ok: false, code: "not_found" };
    return { ok: true, deletionRequestedAt: row.deletion_requested_at };
  });
}

/**
 * Stänger kontot direkt (bokningssidan offline). Idempotent.
 *
 * Säkerhetsgranskning WP-26 (punkt 1): sparar det TIDIGARE `status`-värdet i
 * `status_before_deletion_request`, i stället för att anta 'active' — annars
 * skulle `cancelBusinessDeletion` felaktigt HÄVA en annan frysning (t.ex. en
 * framtida billing-frysning, WP-34) som redan fanns innan radering begärdes.
 */
export async function requestBusinessDeletion(
  userId: string,
  businessId: string,
): Promise<MutationResult> {
  return withServiceTx(async (q) => {
    if (!(await isOwner(q, userId, businessId))) {
      return { ok: false, code: "unauthorized" };
    }
    const r = await q.query(
      `update public.businesses
          set status_before_deletion_request = status,
              status = 'frozen',
              deletion_requested_at = now()
        where id = $1 and deletion_requested_at is null`,
      [businessId],
    );
    if (r.rowCount) return { ok: true };
    const exists = await q.query(`select 1 from public.businesses where id = $1`, [
      businessId,
    ]);
    return exists.rows.length
      ? { ok: false, code: "already_requested" }
      : { ok: false, code: "not_found" };
  });
}

/** Ångrar en begärd radering inom fristen: återställer EXAKT det `status`-
 * värde som `requestBusinessDeletion` sparade undan (punkt 1 ovan), inte
 * ett hårdkodat 'active'. */
export async function cancelBusinessDeletion(
  userId: string,
  businessId: string,
): Promise<MutationResult> {
  return withServiceTx(async (q) => {
    if (!(await isOwner(q, userId, businessId))) {
      return { ok: false, code: "unauthorized" };
    }
    const r = await q.query(
      `update public.businesses
          set status = coalesce(status_before_deletion_request, 'active'),
              status_before_deletion_request = null,
              deletion_requested_at = null
        where id = $1 and deletion_requested_at is not null`,
      [businessId],
    );
    return r.rowCount ? { ok: true } : { ok: false, code: "not_requested" };
  });
}

// ---------------------------------------------------------------------------
// Radering (bara lagringsjobbet, WP-26 steg 4)
// ---------------------------------------------------------------------------

export type PurgeResult =
  | { ok: true }
  | { ok: false; code: "not_found" | "not_requested" | "too_early" };

type EligibilityCheck =
  | { ok: true }
  | { ok: false; code: "not_found" | "not_requested" | "too_early" };

/** Samma tre kontroller görs två gånger (se `purgeBusiness`): en gång innan
 * Storage-anropet (undviker onödig radering om företaget inte är berett),
 * och en gång till under lås i den slutgiltiga transaktionen. */
async function checkPurgeEligible(
  q: Queryable,
  businessId: string,
  lockForUpdate: boolean,
): Promise<EligibilityCheck> {
  const r = await q.query<{
    deletion_requested_at: string | null;
    overdue: boolean;
  }>(
    `select deletion_requested_at,
            (deletion_requested_at is not null
              and deletion_requested_at <= now() - interval '30 days') as overdue
       from public.businesses
      where id = $1
      ${lockForUpdate ? "for update" : ""}`,
    [businessId],
  );
  const business = r.rows[0];
  if (!business) return { ok: false, code: "not_found" };
  if (!business.deletion_requested_at) return { ok: false, code: "not_requested" };
  if (!business.overdue) return { ok: false, code: "too_early" };
  return { ok: true };
}

/**
 * Säkerhetsgranskning WP-26 (punkt B2): raderar business-media/<businessId>/
 * via den RIKTIGA Storage-API:n (`list()` + `remove()`, `getStorageAdminClient()`
 * i src/server/db/pool.ts) — INTE ett SQL-delete mot `storage.objects`, som
 * bara kringgår statement-triggern `storage.protect_delete()` och tar bort
 * METADATARADEN utan att nödvändigtvis radera filen i en molnbackend (S3).
 *
 * Idempotent: `list()` på en redan tom/obefintlig mapp ger en tom lista, och
 * `remove([])` är ett no-op — en omkörning av `purgeBusiness` (t.ex. efter
 * ett tidigare avbrott) upprepar bara samma no-op.
 */
async function purgeBusinessMedia(businessId: string): Promise<void> {
  const bucket = getStorageAdminClient().storage.from("business-media");
  const { data, error } = await bucket.list(businessId, { limit: 1000 });
  if (error) {
    throw new Error(`purgeBusiness: kunde inte lista storage (${error.message})`);
  }
  if (!data || data.length === 0) return;
  const paths = data.map((file) => `${businessId}/${file.name}`);
  const { error: removeError } = await bucket.remove(paths);
  if (removeError) {
    throw new Error(
      `purgeBusiness: kunde inte tömma storage (${removeError.message})`,
    );
  }
}

/**
 * Oåterkallelig. Ingen `userId` — anropas bara av lagringsjobbet
 * (CRON_SECRET, WP-26 steg 4) när `deletion_requested_at` är minst 30 dagar
 * gammalt (kontrolleras oberoende av anroparen, försvar i djupet).
 *
 * Ordning: (1) kontrollera fristen, (2) tömma Storage-mappen (INNAN
 * DB-raderingen, punkt B2 — en avbruten körning kan köras om säkert: steg 2
 * är idempotent, steg 3 har inte hunnit köras än), (3) en enda transaktion
 * som kontrollerar fristen IGEN under lås (skydd mot en kapplöpning med
 * `cancelBusinessDeletion` mellan steg 1/2 och steg 3 — Storage-anrop kan
 * inte vara en del av DB-transaktionen) och raderar `bookings` EXPLICIT före
 * `businesses` (se migrationskommentaren i
 * 20260930080200_business_deletion_lifecycle.sql för varför:
 * `bookings.staff_id`/`service_id`/`customer_id` kaskaderar medvetet INTE —
 * en vanlig radering av en enskild profesional/tjänst ska fortfarande
 * blockeras om den har bokningar — så `bookings` måste vara borta INNAN
 * `staff`/`services`/`customers` kaskadraderas från `businesses`).
 * `payments`/`message_outbox` har ingen egen delete-rättighet (S2,
 * säkerhetsgranskning punkt 6) och försvinner bara via kaskad när deras
 * bokning raderas.
 */
export async function purgeBusiness(businessId: string): Promise<PurgeResult> {
  const eligible = await withServiceTx((q) => checkPurgeEligible(q, businessId, false));
  if (!eligible.ok) return eligible;

  await purgeBusinessMedia(businessId);

  return withServiceTx(async (q) => {
    const recheck = await checkPurgeEligible(q, businessId, true);
    if (!recheck.ok) return recheck;

    const ownersRes = await q.query<{ user_id: string }>(
      `select user_id from public.memberships
        where business_id = $1 and role = 'owner'`,
      [businessId],
    );

    // Kaskaderar payments/message_outbox/booking_answers (D-014, se
    // 20260930080200_business_deletion_lifecycle.sql).
    await q.query(`delete from public.bookings where business_id = $1`, [businessId]);

    // Kaskaderar allt annat: staff, services, service_categories,
    // staff_services, business_hours, staff_hours, time_off, customers,
    // memberships, booking_questions, booking_question_targets,
    // customer_answers, business_images, consent_events.
    await q.query(`delete from public.businesses where id = $1`, [businessId]);

    // Ägarens auth-konto: bara om personen inte längre är medlem i något
    // annat företag. Cross-tenant uppslag (medvetet utan business_id — det
    // är precis frågan: "har den här användaren NÅGON ANNAN medlemskapsrad,
    // oavsett vilket företag"); `memberships` ingår inte i boundaries.test.ts
    // TENANT_TABLES-listan av samma anledning (se även
    // src/server/onboarding/owner-business.ts, som gör motsvarande
    // företagsoberoende uppslag).
    for (const { user_id } of ownersRes.rows) {
      const remaining = await q.query(
        `select 1 from public.memberships where user_id = $1 limit 1`,
        [user_id],
      );
      if (remaining.rows.length === 0) {
        // `security definer`: service_role saknar grant på auth.users
        // direkt (se migrationskommentaren i
        // 20260930080200_business_deletion_lifecycle.sql).
        await q.query(`select private.delete_owner_account($1)`, [user_id]);
      }
    }

    return { ok: true };
  });
}
