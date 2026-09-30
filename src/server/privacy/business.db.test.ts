import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closePool, getStorageAdminClient } from "@/server/db/pool";
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

import {
  cancelBusinessDeletion,
  exportBusiness,
  purgeBusiness,
  requestBusinessDeletion,
} from "./business";

let biz: TestBusiness;
let other: TestBusiness;

const BUCKET = "business-media";

/**
 * Säkerhetsgranskning WP-26 (punkt B2): fixturer och verifikation via den
 * RIKTIGA Storage-API:n (`getStorageAdminClient()`, src/server/db/pool.ts),
 * inte ett SQL-insert/delete mot `storage.objects` — det är precis det som
 * `purgeBusiness` numera också gör, så testet bevisar det faktiska beteendet.
 */
async function uploadTestImage(
  businessId: string,
  filename: string,
): Promise<void> {
  const { error } = await getStorageAdminClient()
    .storage.from(BUCKET)
    .upload(`${businessId}/${filename}`, Buffer.from("fake-image-bytes"), {
      contentType: "image/jpeg",
      upsert: true,
    });
  if (error) throw new Error(`uploadTestImage: ${error.message}`);
}

async function listBusinessMedia(businessId: string): Promise<string[]> {
  const { data, error } = await getStorageAdminClient()
    .storage.from(BUCKET)
    .list(businessId, { limit: 1000 });
  if (error) throw new Error(`listBusinessMedia: ${error.message}`);
  return (data ?? []).map((f) => f.name);
}

/** Ny medlem i `businessId` med en given roll (WP-26 säkerhetsgranskning
 * punkt 2: `admin` är företagsnivå-rollen, inte plattformsadmin). */
async function addMember(
  businessId: string,
  role: "admin" | "staff",
): Promise<string> {
  const userId = await createTestUser();
  await adminQuery(
    `insert into public.memberships (business_id, user_id, role) values ($1, $2, $3)`,
    [businessId, userId, role],
  );
  return userId;
}

async function removeMember(businessId: string, userId: string): Promise<void> {
  await adminQuery(
    `delete from public.memberships where business_id = $1 and user_id = $2`,
    [businessId, userId],
  );
  await dropTestUser(userId);
}

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

describe("exportBusiness (WP-26 steg 3)", () => {
  it("innehåller bara det egna företagets personal/tjänster/kunder/bokningar/samtycke", async () => {
    const r = await exportBusiness(biz.ownerUserId, biz.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.business.id).toBe(biz.id);
    expect(r.data.staff.map((s) => s.id).sort()).toEqual(
      Object.values(biz.staff).sort(),
    );
    expect(r.data.services.map((s) => s.id).sort()).toEqual(
      Object.values(biz.services).sort(),
    );
    // Inget av B:s data läcker in i A:s export.
    for (const s of r.data.staff) {
      expect(Object.values(other.staff)).not.toContain(s.id);
    }
  });

  it("en ägare i ett annat företag får unauthorized", async () => {
    const r = await exportBusiness(other.ownerUserId, biz.id);
    expect(r).toEqual({ ok: false, code: "unauthorized" });
  });

  it("innehåller payments, öppettider, svar och bild-URL:er (punkt 7)", async () => {
    const t = await createTestBusiness();
    try {
      const bookingId = await insertTestBooking(t, {
        start: Date.now() + 60 * 60_000,
        durationMin: 35,
      });
      await adminQuery(
        `insert into public.payments (business_id, booking_id, kind, method, amount_clp, status, paid_at)
         values ($1, $2, 'full', 'cash', 12000, 'approved', now())`,
        [t.id, bookingId],
      );
      const q = await adminQuery<{ id: string }>(
        `insert into public.booking_questions (business_id, label, kind, applies_to, save_to_customer)
         values ($1, 'Alergias', 'short_text', 'all', true) returning id`,
        [t.id],
      );
      await adminQuery(
        `insert into public.booking_answers (business_id, booking_id, question_id, label_snapshot, kind_snapshot, value)
         values ($1, $2, $3, 'Alergias', 'short_text', '"ninguna"'::jsonb)`,
        [t.id, bookingId, q.rows[0]!.id],
      );
      await adminQuery(
        `insert into public.customer_answers (business_id, customer_id, question_id, value)
         values ($1, $2, $3, '"ninguna"'::jsonb)`,
        [t.id, t.customerId, q.rows[0]!.id],
      );
      await adminQuery(
        `update public.businesses set logo_url = 'https://x.test/logo.jpg' where id = $1`,
        [t.id],
      );
      await adminQuery(
        `insert into public.business_images (business_id, path, sort) values ($1, $2, 1)`,
        [t.id, `${t.id}/galeria-1.jpg`],
      );

      const r = await exportBusiness(t.ownerUserId, t.id);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.data.business.logoUrl).toBe("https://x.test/logo.jpg");
      expect(r.data.businessHours.length).toBeGreaterThan(0);
      expect(r.data.payments).toHaveLength(1);
      expect(r.data.payments[0]?.amountClp).toBe(12000);
      expect(r.data.bookingAnswers).toHaveLength(1);
      expect(r.data.customerAnswers).toHaveLength(1);
      expect(r.data.images.map((i) => i.path)).toEqual([
        `${t.id}/galeria-1.jpg`,
      ]);
    } finally {
      await dropTestBusiness(t);
    }
  });

  it("admin (företagsnivå-rollen) får unauthorized — bara owner", async () => {
    const adminUserId = await addMember(biz.id, "admin");
    try {
      expect(await exportBusiness(adminUserId, biz.id)).toEqual({
        ok: false,
        code: "unauthorized",
      });
    } finally {
      await removeMember(biz.id, adminUserId);
    }
  });
});

describe("requestBusinessDeletion / cancelBusinessDeletion (30 dagars ångerfrist)", () => {
  it("stänger kontot direkt (status frozen) och kan ångras inom fristen", async () => {
    const t = await createTestBusiness();
    try {
      const requested = await requestBusinessDeletion(t.ownerUserId, t.id);
      expect(requested).toEqual({ ok: true });

      const afterRequest = await adminQuery<{
        status: string;
        deletion_requested_at: string | null;
      }>(
        `select status, deletion_requested_at from public.businesses where id = $1`,
        [t.id],
      );
      expect(afterRequest.rows[0]?.status).toBe("frozen");
      expect(afterRequest.rows[0]?.deletion_requested_at).not.toBeNull();

      // Idempotent: en andra begäran ändrar inget.
      const again = await requestBusinessDeletion(t.ownerUserId, t.id);
      expect(again).toEqual({ ok: false, code: "already_requested" });

      const cancelled = await cancelBusinessDeletion(t.ownerUserId, t.id);
      expect(cancelled).toEqual({ ok: true });

      const afterCancel = await adminQuery<{
        status: string;
        deletion_requested_at: string | null;
      }>(
        `select status, deletion_requested_at from public.businesses where id = $1`,
        [t.id],
      );
      expect(afterCancel.rows[0]?.status).toBe("active");
      expect(afterCancel.rows[0]?.deletion_requested_at).toBeNull();

      const cancelAgain = await cancelBusinessDeletion(t.ownerUserId, t.id);
      expect(cancelAgain).toEqual({ ok: false, code: "not_requested" });
    } finally {
      await dropTestBusiness(t);
    }
  });

  it("säkerhetsgranskning punkt 1: ångrad radering återställer det TIDIGARE status-värdet, häver inte en annan frysning", async () => {
    const t = await createTestBusiness();
    try {
      // Företaget var redan frozen av en annan anledning (t.ex. en framtida
      // billing-frysning, WP-34) INNAN ägaren begärde radering.
      await adminQuery(
        `update public.businesses set status = 'frozen' where id = $1`,
        [t.id],
      );

      await requestBusinessDeletion(t.ownerUserId, t.id);
      const afterRequest = await adminQuery<{
        status: string;
        status_before_deletion_request: string | null;
      }>(
        `select status, status_before_deletion_request from public.businesses where id = $1`,
        [t.id],
      );
      expect(afterRequest.rows[0]?.status).toBe("frozen");
      expect(afterRequest.rows[0]?.status_before_deletion_request).toBe(
        "frozen",
      );

      await cancelBusinessDeletion(t.ownerUserId, t.id);
      const afterCancel = await adminQuery<{
        status: string;
        status_before_deletion_request: string | null;
      }>(
        `select status, status_before_deletion_request from public.businesses where id = $1`,
        [t.id],
      );
      // Fortfarande 'frozen' — INTE flippat till 'active'.
      expect(afterCancel.rows[0]?.status).toBe("frozen");
      expect(afterCancel.rows[0]?.status_before_deletion_request).toBeNull();
    } finally {
      await dropTestBusiness(t);
    }
  });

  it("en ägare i ett annat företag får unauthorized", async () => {
    const r = await requestBusinessDeletion(other.ownerUserId, biz.id);
    expect(r).toEqual({ ok: false, code: "unauthorized" });
    const row = await adminQuery<{ status: string }>(
      `select status from public.businesses where id = $1`,
      [biz.id],
    );
    expect(row.rows[0]?.status).toBe("active");
  });

  it("admin (företagsnivå-rollen) får unauthorized på request och cancel — bara owner", async () => {
    const adminUserId = await addMember(biz.id, "admin");
    try {
      expect(await requestBusinessDeletion(adminUserId, biz.id)).toEqual({
        ok: false,
        code: "unauthorized",
      });
      expect(await cancelBusinessDeletion(adminUserId, biz.id)).toEqual({
        ok: false,
        code: "unauthorized",
      });
      const row = await adminQuery<{ status: string }>(
        `select status from public.businesses where id = $1`,
        [biz.id],
      );
      expect(row.rows[0]?.status).toBe("active");
    } finally {
      await removeMember(biz.id, adminUserId);
    }
  });
});

describe("purgeBusiness (WP-26 steg 3, oåterkallelig)", () => {
  it("too_early/not_requested/not_found skyddar mot en för tidig eller felaktig radering", async () => {
    const t = await createTestBusiness();
    try {
      expect(await purgeBusiness(t.id)).toEqual({
        ok: false,
        code: "not_requested",
      });
      await requestBusinessDeletion(t.ownerUserId, t.id);
      expect(await purgeBusiness(t.id)).toEqual({
        ok: false,
        code: "too_early",
      });
      expect(
        await purgeBusiness("00000000-0000-0000-0000-000000000000"),
      ).toEqual({ ok: false, code: "not_found" });
    } finally {
      await dropTestBusiness(t);
    }
  });

  it("raderar företaget och tömmer storage-mappen (via Storage-API:n), lämnar andra företag orörda", async () => {
    const t = await createTestBusiness();
    const untouched = await createTestBusiness();
    try {
      const staffId = Object.values(t.staff)[0]!;
      const serviceId = Object.values(t.services)[0]!;
      const bookingId = await insertTestBooking(t, {
        start: Date.now() + 60 * 60_000,
        durationMin: 35,
      });
      await adminQuery(
        `insert into public.payments (business_id, booking_id, kind, method, amount_clp, status, paid_at)
         values ($1, $2, 'full', 'cash', 12000, 'approved', now())`,
        [t.id, bookingId],
      );
      await adminQuery(
        `insert into public.message_outbox
           (business_id, booking_id, channel, recipient_kind, template, category, status, dedupe_key)
         values ($1, $2, 'email', 'customer', 'reservaConfirmada', 'utility', 'queued', $3)`,
        [t.id, bookingId, `purge-test:${bookingId}`],
      );
      await adminQuery(
        `insert into public.consent_events (business_id, customer_id, subject, kind, version, channel, granted)
         values ($1, $2, 'customer', 'terms', 'v1', 'web', true)`,
        [t.id, t.customerId],
      );
      await uploadTestImage(t.id, "portada.jpg");
      await uploadTestImage(untouched.id, "portada.jpg");

      await requestBusinessDeletion(t.ownerUserId, t.id);
      // Backdaterar fristen (30 dagar) — testet väntar inte i verkligheten.
      await adminQuery(
        `update public.businesses set deletion_requested_at = now() - interval '31 days' where id = $1`,
        [t.id],
      );

      const result = await purgeBusiness(t.id);
      expect(result).toEqual({ ok: true });

      const businessRow = await adminQuery(
        `select 1 from public.businesses where id = $1`,
        [t.id],
      );
      expect(businessRow.rowCount).toBe(0);

      const staffRow = await adminQuery(
        `select 1 from public.staff where id = $1`,
        [staffId],
      );
      expect(staffRow.rowCount).toBe(0);
      const serviceRow = await adminQuery(
        `select 1 from public.services where id = $1`,
        [serviceId],
      );
      expect(serviceRow.rowCount).toBe(0);
      const bookingRow = await adminQuery(
        `select 1 from public.bookings where id = $1`,
        [bookingId],
      );
      expect(bookingRow.rowCount).toBe(0);
      const paymentRow = await adminQuery(
        `select 1 from public.payments where booking_id = $1`,
        [bookingId],
      );
      expect(paymentRow.rowCount).toBe(0);
      const outboxRow = await adminQuery(
        `select 1 from public.message_outbox where booking_id = $1`,
        [bookingId],
      );
      expect(outboxRow.rowCount).toBe(0);

      // Storage: tömd, verifierat via list() (Storage-API:n), inte SQL.
      expect(await listBusinessMedia(t.id)).toEqual([]);

      // Ägarens auth-konto: raderat (ingen annan medlemskap).
      const ownerRow = await adminQuery(
        `select 1 from auth.users where id = $1`,
        [t.ownerUserId],
      );
      expect(ownerRow.rowCount).toBe(0);

      // Ett annat företag är helt orört, inklusive dess storage-objekt.
      const otherStillThere = await adminQuery(
        `select 1 from public.businesses where id = $1`,
        [untouched.id],
      );
      expect(otherStillThere.rowCount).toBe(1);
      expect(await listBusinessMedia(untouched.id)).toEqual(["portada.jpg"]);
    } finally {
      await dropTestBusiness(t);
      await dropTestBusiness(untouched);
      // t.id:s mapp är redan tom (det är precis det som testas ovan) —
      // remove() på en redan tömd/obefintlig sökväg är ett no-op.
      await getStorageAdminClient()
        .storage.from(BUCKET)
        .remove([`${t.id}/portada.jpg`, `${untouched.id}/portada.jpg`]);
    }
  });

  it("är idempotent mot storage-mappen: en omkörning efter att mappen redan tömts gör ingenting mer", async () => {
    const t = await createTestBusiness();
    try {
      await uploadTestImage(t.id, "portada.jpg");
      await requestBusinessDeletion(t.ownerUserId, t.id);
      await adminQuery(
        `update public.businesses set deletion_requested_at = now() - interval '31 days' where id = $1`,
        [t.id],
      );
      expect(await purgeBusiness(t.id)).toEqual({ ok: true });
      // Företaget är redan borta → not_found, men Storage-anropet (om det
      // ändå råkade köras igen manuellt) skulle vara ett no-op.
      expect(await purgeBusiness(t.id)).toEqual({
        ok: false,
        code: "not_found",
      });
      expect(await listBusinessMedia(t.id)).toEqual([]);
    } finally {
      await dropTestBusiness(t);
    }
  });

  it("behåller ägarens auth-konto om personen är medlem i ett annat företag", async () => {
    const t = await createTestBusiness();
    const secondBizRow = await adminQuery<{ id: string }>(
      `insert into public.businesses (slug, name, comuna, category)
       values ($1, 'Otro negocio', 'Providencia', 'barberia') returning id`,
      [`t-second-${t.id.slice(0, 8)}`],
    );
    const secondBizId = secondBizRow.rows[0]!.id;
    await adminQuery(
      `insert into public.memberships (business_id, user_id, role) values ($1, $2, 'owner')`,
      [secondBizId, t.ownerUserId],
    );
    try {
      await requestBusinessDeletion(t.ownerUserId, t.id);
      await adminQuery(
        `update public.businesses set deletion_requested_at = now() - interval '31 days' where id = $1`,
        [t.id],
      );
      expect(await purgeBusiness(t.id)).toEqual({ ok: true });

      const ownerRow = await adminQuery(
        `select 1 from auth.users where id = $1`,
        [t.ownerUserId],
      );
      expect(ownerRow.rowCount).toBe(1);
    } finally {
      await adminQuery(`delete from public.businesses where id = $1`, [
        secondBizId,
      ]);
      await dropTestUser(t.ownerUserId);
    }
  });
});
