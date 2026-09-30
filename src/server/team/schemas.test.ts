import { describe, expect, it } from "vitest";

import { PERMS } from "@/server/db/permissions";

import {
  createInvitationSchema,
  invitationFlagsSchema,
  resendInvitationSchema,
  revokeInvitationSchema,
} from "./schemas";

const BUSINESS = "aaaaaaaa-0000-0000-0000-000000000001";
const USER = "11111111-1111-1111-1111-111111111111";
const STAFF = "aaaaaaaa-1000-0000-0000-000000000001";

const ALL_FALSE_FLAGS = Object.fromEntries(
  PERMS.map((p) => [p, false]),
) as Record<(typeof PERMS)[number], boolean>;

describe("invitationFlagsSchema", () => {
  it("nycklarna matchar PERMS exakt (samma mönster som RUBRO_KEYS)", () => {
    expect(Object.keys(invitationFlagsSchema.shape).sort()).toEqual(
      [...PERMS].sort(),
    );
  });

  it("avvisar en okänd flagga", () => {
    const r = invitationFlagsSchema.safeParse({
      ...ALL_FALSE_FLAGS,
      admin: true,
    });
    expect(r.success).toBe(false);
  });
});

describe("createInvitationSchema", () => {
  const valid = {
    businessId: BUSINESS,
    invitedBy: USER,
    invitedByName: "María",
    email: "Nuevo@Example.com",
    staffId: STAFF,
    flags: ALL_FALSE_FLAGS,
  };

  it("acepta datos válidos y normaliza el correo a minúsculas", () => {
    const r = createInvitationSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("nuevo@example.com");
  });

  it("rechaza un correo inválido", () => {
    const r = createInvitationSchema.safeParse({
      ...valid,
      email: "no-es-un-correo",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("invitation.email_invalid");
  });

  it("rechaza un businessId que no es un guid (id 'vanity' de seed lo sería mediante z.guid())", () => {
    const r = createInvitationSchema.safeParse({
      ...valid,
      businessId: "no-es-uuid",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza un nombre vacío", () => {
    const r = createInvitationSchema.safeParse({
      ...valid,
      invitedByName: "  ",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("invitation.name_empty");
  });

  it("rechaza campos desconocidos (strictObject)", () => {
    const r = createInvitationSchema.safeParse({ ...valid, extra: true });
    expect(r.success).toBe(false);
  });
});

describe("resendInvitationSchema / revokeInvitationSchema", () => {
  it("resend exige invitedByName", () => {
    const r = resendInvitationSchema.safeParse({
      businessId: BUSINESS,
      invitationId: STAFF,
      userId: USER,
      invitedByName: "María",
    });
    expect(r.success).toBe(true);
  });

  it("revoke no exige invitedByName y rechaza campos desconocidos", () => {
    const ok = revokeInvitationSchema.safeParse({
      businessId: BUSINESS,
      invitationId: STAFF,
      userId: USER,
    });
    expect(ok.success).toBe(true);
    const bad = revokeInvitationSchema.safeParse({
      businessId: BUSINESS,
      invitationId: STAFF,
      userId: USER,
      invitedByName: "María",
    });
    expect(bad.success).toBe(false);
  });
});
