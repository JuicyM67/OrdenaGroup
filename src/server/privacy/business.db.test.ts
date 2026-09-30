import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  createTestClient,
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

/**
 * `storage.protect_delete()` (statement-nivå-trigger) blockerar ALLA
 * raderingar av `storage.objects` utan `storage.allow_delete_query = 'true'`
 * satt på SAMMA session (samma mönster som
 * supabase/tests/101_business_media_storage.test.sql) — `adminQuery` kan inte
 * garantera samma pool-anslutning mellan två anrop, så en egen klient krävs.
 */
async function deleteStorageObjectsUnderPrefix(prefix: string): Promise<void> {
  const client = await createTestClient();
  try {
    await client.query(`set storage.allow_delete_query = 'true'`);
    await client.query(
      `delete from storage.objects where bucket_id = 'business-media' and name like $1`,
      [`${prefix}/%`],
    );
  } finally {
    await client.end();
  }
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
      }>(`select status, deletion_requested_at from public.businesses where id = $1`, [
        t.id,
      ]);
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
      }>(`select status, deletion_requested_at from public.businesses where id = $1`, [
        t.id,
      ]);
      expect(afterCancel.rows[0]?.status).toBe("active");
      expect(afterCancel.rows[0]?.deletion_requested_at).toBeNull();

      const cancelAgain = await cancelBusinessDeletion(t.ownerUserId, t.id);
      expect(cancelAgain).toEqual({ ok: false, code: "not_requested" });
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
      expect(await purgeBusiness(t.id)).toEqual({ ok: false, code: "too_early" });
      expect(
        await purgeBusiness("00000000-0000-0000-0000-000000000000"),
      ).toEqual({ ok: false, code: "not_found" });
    } finally {
      await dropTestBusiness(t);
    }
  });

  it("raderar företaget och tömmer storage-mappen, lämnar andra företag orörda", async () => {
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
      await adminQuery(
        `insert into storage.objects (bucket_id, name) values ('business-media', $1)`,
        [`${t.id}/portada.jpg`],
      );
      await adminQuery(
        `insert into storage.objects (bucket_id, name) values ('business-media', $1)`,
        [`${untouched.id}/portada.jpg`],
      );

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

      const staffRow = await adminQuery(`select 1 from public.staff where id = $1`, [
        staffId,
      ]);
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

      const storageRows = await adminQuery(
        `select name from storage.objects where bucket_id = 'business-media' and name like $1`,
        [`${t.id}/%`],
      );
      expect(storageRows.rowCount).toBe(0);

      // Ägarens auth-konto: raderat (ingen annan medlemskap).
      const ownerRow = await adminQuery(`select 1 from auth.users where id = $1`, [
        t.ownerUserId,
      ]);
      expect(ownerRow.rowCount).toBe(0);

      // Ett annat företag är helt orört, inklusive dess storage-objekt.
      const otherStillThere = await adminQuery(
        `select 1 from public.businesses where id = $1`,
        [untouched.id],
      );
      expect(otherStillThere.rowCount).toBe(1);
      const otherStorage = await adminQuery(
        `select 1 from storage.objects where bucket_id = 'business-media' and name = $1`,
        [`${untouched.id}/portada.jpg`],
      );
      expect(otherStorage.rowCount).toBe(1);
    } finally {
      await dropTestBusiness(t);
      await dropTestBusiness(untouched);
      // t.id:s objekt är redan borta (det är precis det som testas ovan) —
      // städar ändå båda prefixen, städningen är idempotent.
      await deleteStorageObjectsUnderPrefix(t.id);
      await deleteStorageObjectsUnderPrefix(untouched.id);
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

      const ownerRow = await adminQuery(`select 1 from auth.users where id = $1`, [
        t.ownerUserId,
      ]);
      expect(ownerRow.rowCount).toBe(1);
    } finally {
      await adminQuery(`delete from public.businesses where id = $1`, [secondBizId]);
      await dropTestUser(t.ownerUserId);
    }
  });
});
