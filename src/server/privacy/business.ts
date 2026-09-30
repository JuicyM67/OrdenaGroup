import "server-only";

import { withServiceTx } from "@/server/db/tx";

import { isOwnerOrAdmin } from "./authz";
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
 * Alla fyra kör som `service_role` och gör sin egen medlemskapskontroll
 * (`isOwnerOrAdmin`) i stället för att lita på RLS — `businesses.status`/
 * `deletion_requested_at` kan bara ändras av service_role (B2), och
 * `purgeBusiness` har ingen inloggad användare alls (cron, CRON_SECRET).
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
    createdAt: string;
  };
  staff: Array<{ id: string; name: string; title: string | null; active: boolean }>;
  services: Array<{
    id: string;
    name: string;
    durationMin: number;
    priceClp: number;
    active: boolean;
  }>;
  customers: Array<{
    id: string;
    phoneE164: string | null;
    name: string | null;
    email: string | null;
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
  }>;
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
    if (!(await isOwnerOrAdmin(q, userId, businessId))) {
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
      created_at: string;
    }>(
      `select id, slug, name, comuna, category, phone, address, created_at
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
    }>(
      `select id, name, title, active from public.staff
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

    const customersRes = await q.query<{
      id: string;
      phone_e164: string | null;
      name: string | null;
      email: string | null;
      anonymized_at: string | null;
      created_at: string;
    }>(
      `select id, phone_e164, name, email, anonymized_at, created_at
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
    }>(
      `select id, staff_id, service_id, customer_id, status,
              lower(period) as period_start, upper(period) as period_end, price_clp
         from public.bookings where business_id = $1 order by created_at`,
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
          createdAt: business.created_at,
        },
        staff: staffRes.rows.map((s) => ({
          id: s.id,
          name: s.name,
          title: s.title,
          active: s.active,
        })),
        services: servicesRes.rows.map((s) => ({
          id: s.id,
          name: s.name,
          durationMin: s.duration_min,
          priceClp: s.price_clp,
          active: s.active,
        })),
        customers: customersRes.rows.map((c) => ({
          id: c.id,
          phoneE164: c.phone_e164,
          name: c.name,
          email: c.email,
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
        })),
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

/** Stänger kontot direkt (bokningssidan offline). Idempotent. */
export async function requestBusinessDeletion(
  userId: string,
  businessId: string,
): Promise<MutationResult> {
  return withServiceTx(async (q) => {
    if (!(await isOwnerOrAdmin(q, userId, businessId))) {
      return { ok: false, code: "unauthorized" };
    }
    const r = await q.query(
      `update public.businesses
          set status = 'frozen', deletion_requested_at = now()
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

/** Ångrar en begärd radering inom fristen. */
export async function cancelBusinessDeletion(
  userId: string,
  businessId: string,
): Promise<MutationResult> {
  return withServiceTx(async (q) => {
    if (!(await isOwnerOrAdmin(q, userId, businessId))) {
      return { ok: false, code: "unauthorized" };
    }
    const r = await q.query(
      `update public.businesses
          set status = 'active', deletion_requested_at = null
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

/**
 * Oåterkallelig. Ingen `userId` — anropas bara av lagringsjobbet
 * (CRON_SECRET, WP-26 steg 4) när `deletion_requested_at` är minst 30 dagar
 * gammalt (kontrolleras här igen, oberoende av anroparen, försvar i djupet).
 *
 * Ordning inom transaktionen (se migrationskommentaren i
 * 20260930080200_business_deletion_lifecycle.sql för varför): `bookings`
 * raderas EXPLICIT före `businesses`, så att `staff`/`services`/`customers`
 * kan kaskadraderas från `businesses` utan att blockeras av
 * `bookings.staff_id`/`service_id`/`customer_id` (som medvetet INTE
 * kaskaderar — en vanlig radering av en enskild profesional/tjänst ska
 * fortfarande blockeras om den har bokningar). `payments`/`message_outbox`
 * har ingen egen delete-rättighet och försvinner bara via kaskad när deras
 * bokning raderas.
 */
export async function purgeBusiness(businessId: string): Promise<PurgeResult> {
  return withServiceTx(async (q) => {
    const businessRes = await q.query<{
      deletion_requested_at: string | null;
      overdue: boolean;
    }>(
      `select deletion_requested_at,
              (deletion_requested_at is not null
                and deletion_requested_at <= now() - interval '30 days') as overdue
         from public.businesses
        where id = $1
        for update`,
      [businessId],
    );
    const business = businessRes.rows[0];
    if (!business) return { ok: false, code: "not_found" };
    if (!business.deletion_requested_at) return { ok: false, code: "not_requested" };
    if (!business.overdue) return { ok: false, code: "too_early" };

    const ownersRes = await q.query<{ user_id: string }>(
      `select user_id from public.memberships
        where business_id = $1 and role = 'owner'`,
      [businessId],
    );

    // Kaskaderar payments/message_outbox/booking_answers (D-014, se
    // 20260930080200_business_deletion_lifecycle.sql).
    await q.query(`delete from public.bookings where business_id = $1`, [businessId]);

    // Storage: hela mappen business-media/<businessId>/, inklusive
    // personalfoton (staff.photo_url), omslag/logga/galleri. `protect_delete()`
    // (statement-nivå-trigger) blockerar ALLA raderingar av storage.objects
    // utan den här sessionsflaggan, oavsett roll/RLS (samma mönster som
    // supabase/tests/101_business_media_storage.test.sql).
    await q.query(`set local storage.allow_delete_query = 'true'`);
    await q.query(
      `delete from storage.objects where bucket_id = 'business-media' and name like $1`,
      [`${businessId}/%`],
    );

    // Kaskaderar allt annat: staff, services, service_categories,
    // staff_services, business_hours, staff_hours, time_off, customers,
    // memberships, booking_questions, booking_question_targets,
    // customer_answers, business_images, consent_events.
    await q.query(`delete from public.businesses where id = $1`, [businessId]);

    // Ägarens auth-konto: bara om personen inte längre är medlem i något
    // annat företag (cross-tenant uppslag, medvetet utan business_id — se
    // OWNER_ACCOUNT_LOOKUP_EXCEPTION i src/server/boundaries.test.ts).
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
