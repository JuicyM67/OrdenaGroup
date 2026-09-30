import { describe, expect, it } from "vitest";

import {
  hasPerm,
  PermissionDeniedError,
  requirePerm,
  type Member,
  type Perm,
} from "./permissions";

function member(over: Partial<Member> = {}): Member {
  return {
    userId: "11111111-1111-1111-1111-111111111111",
    businessId: "aaaaaaaa-0000-0000-0000-000000000001",
    role: "staff",
    staffId: null,
    perms: {
      can_manage_own_bookings: false,
      can_manage_all_bookings: false,
      can_cancel_bookings: false,
      can_edit_catalog: false,
      can_manage_team: false,
      can_view_reports: false,
      can_edit_settings: false,
    },
    ...over,
  };
}

const ALL_PERMS: Perm[] = [
  "can_manage_own_bookings",
  "can_manage_all_bookings",
  "can_cancel_bookings",
  "can_edit_catalog",
  "can_manage_team",
  "can_view_reports",
  "can_edit_settings",
];

describe("hasPerm", () => {
  it("null (ingen medlem) -> false för alla flaggor", () => {
    for (const perm of ALL_PERMS) expect(hasPerm(null, perm)).toBe(false);
  });

  it("owner har alltid allt, oavsett kolumnerna (D-034)", () => {
    const owner = member({ role: "owner" });
    for (const perm of ALL_PERMS) expect(hasPerm(owner, perm)).toBe(true);
  });

  it("vendor får aldrig true, även om en flagga råkar vara satt", () => {
    const vendor = member({
      role: "vendor",
      perms: { ...member().perms, can_manage_all_bookings: true },
    });
    expect(hasPerm(vendor, "can_manage_all_bookings")).toBe(false);
  });

  it("admin (plattformsrollen, F19) får aldrig true via en flagga", () => {
    const admin = member({
      role: "admin",
      perms: { ...member().perms, can_edit_catalog: true },
    });
    expect(hasPerm(admin, "can_edit_catalog")).toBe(false);
  });

  it("staff utan flaggan -> false, med flaggan -> true", () => {
    const staff = member({
      perms: { ...member().perms, can_edit_catalog: true },
    });
    expect(hasPerm(staff, "can_edit_catalog")).toBe(true);
    expect(hasPerm(staff, "can_manage_team")).toBe(false);
  });

  it("can_manage_own_bookings + staffId: kräver att staffId matchar den egna", () => {
    const staff = member({
      staffId: "ssss0000-0000-0000-0000-000000000001",
      perms: { ...member().perms, can_manage_own_bookings: true },
    });
    expect(
      hasPerm(staff, "can_manage_own_bookings", {
        staffId: "ssss0000-0000-0000-0000-000000000001",
      }),
    ).toBe(true);
    expect(
      hasPerm(staff, "can_manage_own_bookings", {
        staffId: "ssss0000-0000-0000-0000-000000000002",
      }),
    ).toBe(false);
  });

  it("can_manage_own_bookings utan egen staffId (staffId: null) -> false trots flaggan", () => {
    const staff = member({
      staffId: null,
      perms: { ...member().perms, can_manage_own_bookings: true },
    });
    expect(
      hasPerm(staff, "can_manage_own_bookings", {
        staffId: "ssss0000-0000-0000-0000-000000000001",
      }),
    ).toBe(false);
  });

  it("owner matchar staffId-kravet också (kortslutning före jämförelsen)", () => {
    const owner = member({ role: "owner", staffId: null });
    expect(
      hasPerm(owner, "can_manage_own_bookings", {
        staffId: "ssss0000-0000-0000-0000-000000000001",
      }),
    ).toBe(true);
  });
});

describe("requirePerm", () => {
  it("kastar PermissionDeniedError när hasPerm är false", () => {
    expect(() => requirePerm(null, "can_cancel_bookings")).toThrow(
      PermissionDeniedError,
    );
  });

  it("kastar inget när hasPerm är true", () => {
    const owner = member({ role: "owner" });
    expect(() => requirePerm(owner, "can_cancel_bookings")).not.toThrow();
  });

  it("felet bär med sig vilken flagga som saknades", () => {
    try {
      requirePerm(member(), "can_manage_team");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(PermissionDeniedError);
      expect((e as PermissionDeniedError).perm).toBe("can_manage_team");
    }
  });
});
