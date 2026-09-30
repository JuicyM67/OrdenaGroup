import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadMember } from "./permissions";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  createTestUser,
  dropTestBusiness,
  dropTestUser,
  type TestBusiness,
} from "./testing";
import { closePool } from "./pool";
import { withServiceTx } from "./tx";

/**
 * WP-46 steg 3: `loadMember` mot en riktig databas — bevisar att den läser
 * exakt samma kolumner/defaultvärden som RLS-policyerna
 * (20260930150000_membership_permission_flags.sql) förlitar sig på.
 */

let biz: TestBusiness;
let staffUserId: string;
let staffKeyId: string;
let nomember: string;

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness();
  staffKeyId = biz.staff["diego"]!;
  staffUserId = await createTestUser();
  await adminQuery(
    `insert into public.memberships (business_id, user_id, role, staff_id, can_manage_all_bookings)
     values ($1, $2, 'staff', $3, true)`,
    [biz.id, staffUserId, staffKeyId],
  );
  nomember = await createTestUser();
});

afterAll(async () => {
  await dropTestUser(staffUserId);
  await dropTestUser(nomember);
  await dropTestBusiness(biz);
  await closePool();
});

describe("loadMember", () => {
  it("null om personen inte är medlem i företaget", async () => {
    const m = await withServiceTx((q) => loadMember(q, nomember, biz.id));
    expect(m).toBeNull();
  });

  it("owner: role='owner', staffId null, perms oväsentliga (has_perm kortsluter ändå)", async () => {
    const m = await withServiceTx((q) => loadMember(q, biz.ownerUserId, biz.id));
    expect(m).not.toBeNull();
    expect(m?.role).toBe("owner");
    expect(m?.staffId).toBeNull();
  });

  it("staff: läser staff_id och de satta flaggorna, defaultflaggan can_manage_own_bookings=true", async () => {
    const m = await withServiceTx((q) => loadMember(q, staffUserId, biz.id));
    expect(m).not.toBeNull();
    expect(m?.role).toBe("staff");
    expect(m?.staffId).toBe(staffKeyId);
    expect(m?.perms.can_manage_own_bookings).toBe(true);
    expect(m?.perms.can_manage_all_bookings).toBe(true);
    expect(m?.perms.can_cancel_bookings).toBe(false);
    expect(m?.perms.can_edit_catalog).toBe(false);
    expect(m?.perms.can_manage_team).toBe(false);
    expect(m?.perms.can_view_reports).toBe(false);
    expect(m?.perms.can_edit_settings).toBe(false);
  });

  it("fel företag -> null (tenant-isolering, precis som private.is_member)", async () => {
    const other = await createTestBusiness();
    try {
      const m = await withServiceTx((q) => loadMember(q, staffUserId, other.id));
      expect(m).toBeNull();
    } finally {
      await dropTestBusiness(other);
    }
  });
});
