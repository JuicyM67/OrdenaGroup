import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * WP-80 (D-061): plattformsadmins i /admin/administradores. Databasen är en
 * fejk-`Queryable`; GoTrue (`auth.admin.*`) och mejlet är mockade.
 */
type Call = { text: string; values: unknown[] };
const h = vi.hoisted(() => ({
  calls: [] as Call[],
  admins: [] as string[],
  insertRowCount: 1,
  emails: new Map<string, string>(),
  createUser: vi.fn(),
  generateLink: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/server/db/tx", () => ({
  withServiceTx: async <T>(fn: (q: unknown) => Promise<T>) =>
    fn({
      query: async (text: string, values: unknown[] = []) => {
        h.calls.push({ text, values });
        if (
          /select user_id from private\.platform_admins for update/.test(text)
        )
          return { rows: h.admins.map((user_id) => ({ user_id })) };
        if (/insert into private\.platform_admins/.test(text))
          return { rows: [], rowCount: h.insertRowCount };
        return { rows: [], rowCount: 1 };
      },
    }),
}));
vi.mock("@/server/db/pool", () => ({
  getStorageAdminClient: () => ({
    auth: {
      admin: {
        createUser: h.createUser,
        generateLink: h.generateLink,
        mfa: { listFactors: async () => ({ data: { factors: [] } }) },
      },
    },
  }),
}));
vi.mock("@/server/messaging/email/send", () => ({ sendEmail: h.sendEmail }));
vi.mock("./businesses", () => ({ emailsByUserId: async () => h.emails }));

const { addPlatformAdmin, removePlatformAdmin, normalizeAdminEmail } =
  await import("./admins");

const ME = "a0000000-0000-4000-8000-000000000001";
const OTHER = "a0000000-0000-4000-8000-000000000002";
const NEW = "a0000000-0000-4000-8000-000000000003";

function auditCalls(): Call[] {
  return h.calls.filter((c) => c.text.includes("admin_audit_log"));
}

beforeEach(() => {
  h.calls.length = 0;
  h.admins = [ME, OTHER];
  h.insertRowCount = 1;
  h.emails = new Map([
    [ME, "yo@example.com"],
    [OTHER, "otra@example.com"],
  ]);
  h.createUser.mockReset();
  h.generateLink.mockReset();
  h.generateLink.mockResolvedValue({
    data: { properties: { hashed_token: "hash" } },
    error: null,
  });
  h.sendEmail.mockReset();
  h.sendEmail.mockResolvedValue({ id: "x" });
});

describe("normalizeAdminEmail", () => {
  it("normaliserar och validerar", () => {
    expect(normalizeAdminEmail("  Ana@Example.COM ")).toBe("ana@example.com");
    expect(normalizeAdminEmail("ana")).toBeNull();
  });
});

describe("removePlatformAdmin", () => {
  it("kan inte ta bort sig själv — utan att röra databasen", async () => {
    expect(await removePlatformAdmin(ME, ME)).toEqual({
      ok: false,
      code: "cannot_remove_self",
    });
    expect(h.calls).toEqual([]);
  });

  it("kan inte ta bort den sista adminen", async () => {
    h.admins = [OTHER];
    expect(await removePlatformAdmin(ME, OTHER)).toEqual({
      ok: false,
      code: "last_admin",
    });
    expect(h.calls.some((c) => c.text.includes("delete"))).toBe(false);
    expect(auditCalls()).toEqual([]);
  });

  it("okänd admin → not_found", async () => {
    expect(await removePlatformAdmin(ME, NEW)).toEqual({
      ok: false,
      code: "not_found",
    });
  });

  it("tar bort, låser raderna först och loggar i samma transaktion", async () => {
    expect(await removePlatformAdmin(ME, OTHER)).toEqual({ ok: true });
    const texts = h.calls.map((c) => c.text);
    expect(texts[0]).toMatch(/for update/);
    expect(texts[1]).toMatch(/delete from private\.platform_admins/);
    const audit = auditCalls();
    expect(audit).toHaveLength(1);
    expect(audit[0]!.values.slice(0, 4)).toEqual([
      ME,
      "remove_admin",
      null,
      OTHER,
    ]);
  });
});

describe("addPlatformAdmin", () => {
  it("ogiltig e-post → invalid_email", async () => {
    expect(await addPlatformAdmin(ME, "nada")).toEqual({
      ok: false,
      code: "invalid_email",
    });
    expect(h.calls).toEqual([]);
  });

  it("befintligt konto läggs till direkt, loggas och får länken", async () => {
    h.emails.set(NEW, "Nueva@Example.com");
    const r = await addPlatformAdmin(ME, "nueva@example.com");
    expect(r).toEqual({ ok: true, createdAccount: false, emailSent: true });
    expect(h.createUser).not.toHaveBeenCalled();
    const insert = h.calls.find((c) =>
      c.text.includes("insert into private.platform_admins"),
    );
    expect(insert!.values).toEqual([NEW, ME]);
    const audit = auditCalls();
    expect(audit).toHaveLength(1);
    expect(audit[0]!.values[1]).toBe("add_admin");
    expect(audit[0]!.values[3]).toBe(NEW);
    // Regel 7: ingen e-postadress i loggen.
    expect(JSON.stringify(audit[0]!.values)).not.toContain("example.com");
    expect(h.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "nueva@example.com",
        template: "invitacionAdmin",
      }),
    );
  });

  it("utan konto skapas det (bekräftad e-post) och läggs till", async () => {
    h.createUser.mockResolvedValue({
      data: { user: { id: NEW } },
      error: null,
    });
    const r = await addPlatformAdmin(ME, "nueva@example.com");
    expect(r).toEqual({ ok: true, createdAccount: true, emailSent: true });
    expect(h.createUser).toHaveBeenCalledWith({
      email: "nueva@example.com",
      email_confirm: true,
    });
    expect(auditCalls()[0]!.values[4]).toBe(
      JSON.stringify({ created_account: true }),
    );
  });

  it("redan admin → already_admin, ingen logg och inget mejl", async () => {
    h.insertRowCount = 0;
    expect(await addPlatformAdmin(ME, "otra@example.com")).toEqual({
      ok: false,
      code: "already_admin",
    });
    expect(auditCalls()).toEqual([]);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("mejlet misslyckas → fortfarande tillagd, emailSent false", async () => {
    h.emails.set(NEW, "nueva@example.com");
    h.sendEmail.mockRejectedValue(new Error("resend"));
    expect(await addPlatformAdmin(ME, "nueva@example.com")).toEqual({
      ok: true,
      createdAccount: false,
      emailSent: false,
    });
  });
});
