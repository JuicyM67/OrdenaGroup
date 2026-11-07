import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  createTestUser,
  dropTestBusiness,
  dropTestUser,
  type TestBusiness,
} from "@/server/db/testing";
import type { Perm } from "@/server/db/permissions";

import {
  createInvitation,
  resendInvitation,
  revokeInvitation,
} from "./invitations";

/**
 * WP-46 steg 4 (integrations-engineer): `createInvitation`/
 * `resendInvitation`/`revokeInvitation` mot en riktig lokal databas
 * (`member_invitations`/RLS/triggers är db-engineerns, se
 * `supabase/migrations/20260930150{300,400}_*.sql`) — samma mönster som
 * `src/server/privacy/customer.db.test.ts`.
 */

const NO_FLAGS: Record<Perm, boolean> = {
  can_manage_own_bookings: true,
  can_manage_all_bookings: false,
  can_cancel_bookings: false,
  can_edit_catalog: false,
  can_manage_team: false,
  can_view_reports: false,
  can_edit_settings: false,
  can_view_records: false,
};

let biz: TestBusiness;
let other: TestBusiness;
let staffUserId: string;

beforeAll(async () => {
  assertLocalDatabase();
  // Fyra personalrader: varje test som ska LYCKAS bjuder in en egen, unik
  // rad (det partiella unika indexet tillåter bara en levande inbjudan per
  // personalrad, se `member_invitations_business_staff_pending_uidx`) —
  // ingen av testerna återkallar sin inbjudan, så de får inte krocka.
  biz = await createTestBusiness({
    staff: [
      { key: "diego", name: "Diego", sort: 1 },
      { key: "matias", name: "Matías", sort: 2 },
      { key: "tomas", name: "Tomás", sort: 3 },
      { key: "ana", name: "Ana", sort: 4 },
    ],
  });
  other = await createTestBusiness();
  // Plan `local` (gräns 10, `20260930160000_plan_staff_limits.sql`): testerna
  // nedan lämnar avsiktligt flera inbjudningar väntande samtidigt (en per
  // personalrad, se kommentaren ovan) — `free` (gräns 1, bara ägarens egen
  // plats) skulle blockera redan den FÖRSTA inbjudan.
  await adminQuery(
    `update public.businesses set plan = 'local' where id = $1`,
    [biz.id],
  );
  // Ett konto som är `staff` i `biz` (inte `owner`) — för "icke-ägare"-testet.
  staffUserId = await createTestUser();
  await adminQuery(
    `insert into public.memberships (business_id, user_id, role, staff_id)
     values ($1, $2, 'staff', $3)`,
    [biz.id, staffUserId, biz.staff.diego],
  );
});

afterAll(async () => {
  await dropTestUser(staffUserId);
  await dropTestBusiness(biz);
  await dropTestBusiness(other);
  await closePool();
});

async function outboxRowFor(invitationId: string) {
  const r = await adminQuery<{
    business_id: string;
    channel: string;
    recipient_kind: string;
    template: string;
    category: string;
    status: string;
    payload: Record<string, unknown>;
  }>(
    `select business_id, channel, recipient_kind, template, category, status, payload
       from public.message_outbox
      where payload->>'invitationId' = $1`,
    [invitationId],
  );
  return r.rows;
}

describe("createInvitation", () => {
  it("ägaren kan bjuda in: rad i member_invitations + en utkorgsrad utan adress i payload", async () => {
    const r = await createInvitation({
      businessId: biz.id,
      invitedBy: biz.ownerUserId,
      invitedByName: "María Dueña",
      email: "Nuevo.Staff@Example.com",
      staffId: biz.staff.matias!,
      flags: NO_FLAGS,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const invRes = await adminQuery<{
      email: string;
      staff_id: string;
      invited_by: string;
      accepted_at: string | null;
      revoked_at: string | null;
      can_manage_all_bookings: boolean;
    }>(
      `select email, staff_id, invited_by, accepted_at, revoked_at, can_manage_all_bookings
         from public.member_invitations where id = $1`,
      [r.invitationId],
    );
    const row = invRes.rows[0]!;
    // E-post normaliserad till gemener (zod .toLowerCase()).
    expect(row.email).toBe("nuevo.staff@example.com");
    expect(row.staff_id).toBe(biz.staff.matias);
    expect(row.invited_by).toBe(biz.ownerUserId);
    expect(row.accepted_at).toBeNull();
    expect(row.revoked_at).toBeNull();
    expect(row.can_manage_all_bookings).toBe(false);

    const outbox = await outboxRowFor(r.invitationId);
    expect(outbox).toHaveLength(1);
    const msg = outbox[0]!;
    expect(msg.business_id).toBe(biz.id);
    expect(msg.channel).toBe("email");
    expect(msg.recipient_kind).toBe("invitee");
    expect(msg.template).toBe("invitacionEquipo");
    expect(msg.category).toBe("utility");
    expect(msg.status).toBe("queued");
    // Ingen e-postadress i utkorgen (regel: workern slår upp den via
    // invitationId) — bara invitationId, token och invitadoPor.
    expect(Object.keys(msg.payload).sort()).toEqual(
      ["invitadoPor", "invitationId", "token"].sort(),
    );
    expect(msg.payload.invitadoPor).toBe("María Dueña");
    expect(typeof msg.payload.token).toBe("string");
    expect((msg.payload.token as string).length).toBeGreaterThan(30);
  });

  it("en icke-ägare (staff) kan INTE bjuda in — unauthorized, ingen rad skapas", async () => {
    const r = await createInvitation({
      businessId: biz.id,
      invitedBy: staffUserId,
      invitedByName: "Diego Staff",
      email: "otro@example.com",
      staffId: biz.staff.tomas!,
      flags: NO_FLAGS,
    });
    expect(r).toEqual({ ok: false, code: "unauthorized" });

    const exists = await adminQuery(
      `select 1 from public.member_invitations where business_id = $1 and email = 'otro@example.com'`,
      [biz.id],
    );
    expect(exists.rows).toHaveLength(0);
  });

  it("ägare i ETT ANNAT företag kan inte bjuda in till biz", async () => {
    const r = await createInvitation({
      businessId: biz.id,
      invitedBy: other.ownerUserId,
      invitedByName: "Otro Dueño",
      email: "intruso@example.com",
      staffId: biz.staff.diego!,
      flags: NO_FLAGS,
    });
    expect(r).toEqual({ ok: false, code: "unauthorized" });
  });

  it("personal som inte tillhör företaget ger staff_not_found", async () => {
    const r = await createInvitation({
      businessId: biz.id,
      invitedBy: biz.ownerUserId,
      invitedByName: "María Dueña",
      email: "staff-de-otro@example.com",
      staffId: other.staff.diego!,
      flags: NO_FLAGS,
    });
    expect(r).toEqual({ ok: false, code: "staff_not_found" });
  });

  it("en andra inbjudan till samma (ännu obesvarade) personalrad ger invitation_pending", async () => {
    const first = await createInvitation({
      businessId: biz.id,
      invitedBy: biz.ownerUserId,
      invitedByName: "María Dueña",
      email: "primera@example.com",
      staffId: biz.staff.tomas!,
      flags: NO_FLAGS,
    });
    expect(first.ok).toBe(true);

    const second = await createInvitation({
      businessId: biz.id,
      invitedBy: biz.ownerUserId,
      invitedByName: "María Dueña",
      email: "segunda@example.com",
      staffId: biz.staff.tomas!,
      flags: NO_FLAGS,
    });
    expect(second).toEqual({ ok: false, code: "invitation_pending" });
  });
});

describe("resendInvitation / revokeInvitation", () => {
  it("resend: nytt token/förfallodatum, en NY utkorgsrad (adressen ligger inte i payload)", async () => {
    const created = await createInvitation({
      businessId: biz.id,
      invitedBy: biz.ownerUserId,
      invitedByName: "María Dueña",
      email: "reenviar@example.com",
      staffId: biz.staff.diego!,
      flags: NO_FLAGS,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const before = await adminQuery<{ token_hash: Buffer; expires_at: string }>(
      `select token_hash, expires_at from public.member_invitations where id = $1`,
      [created.invitationId],
    );

    const r = await resendInvitation({
      businessId: biz.id,
      invitationId: created.invitationId,
      userId: biz.ownerUserId,
      invitedByName: "Otra Dueña (reenvío)",
    });
    expect(r).toEqual({ ok: true });

    const after = await adminQuery<{ token_hash: Buffer; expires_at: string }>(
      `select token_hash, expires_at from public.member_invitations where id = $1`,
      [created.invitationId],
    );
    expect(after.rows[0]!.token_hash.equals(before.rows[0]!.token_hash)).toBe(
      false,
    );

    const outbox = await outboxRowFor(created.invitationId);
    expect(outbox).toHaveLength(2);
    const resent = outbox.find(
      (o) => o.payload.invitadoPor === "Otra Dueña (reenvío)",
    );
    expect(resent).toBeDefined();
  });

  it("revoke: bara ägaren, och en redan återkallad inbjudan kan inte återkallas igen", async () => {
    const created = await createInvitation({
      businessId: biz.id,
      invitedBy: biz.ownerUserId,
      invitedByName: "María Dueña",
      email: "revocar@example.com",
      staffId: biz.staff.ana!,
      flags: NO_FLAGS,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const denied = await revokeInvitation({
      businessId: biz.id,
      invitationId: created.invitationId,
      userId: staffUserId,
    });
    expect(denied).toEqual({ ok: false, code: "unauthorized" });

    const ok = await revokeInvitation({
      businessId: biz.id,
      invitationId: created.invitationId,
      userId: biz.ownerUserId,
    });
    expect(ok).toEqual({ ok: true });

    const again = await revokeInvitation({
      businessId: biz.id,
      invitationId: created.invitationId,
      userId: biz.ownerUserId,
    });
    expect(again).toEqual({ ok: false, code: "already_revoked" });
  });
});
