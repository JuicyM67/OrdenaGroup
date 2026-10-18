import { beforeEach, describe, expect, it, vi } from "vitest";

/** WP-80 (D-061): inbjudan bär `billing_mode`/`billing_note` till databasen. */
type Call = { text: string; values: unknown[] };
const h = vi.hoisted(() => ({
  calls: [] as Call[],
  sendEmail: vi.fn(),
}));

vi.mock("@/server/db/tx", () => ({
  withServiceTx: async <T>(fn: (q: unknown) => Promise<T>) =>
    fn({
      query: async (text: string, values: unknown[] = []) => {
        h.calls.push({ text, values });
        return { rows: [{ id: "inv-1" }], rowCount: 1 };
      },
    }),
}));
vi.mock("@/server/messaging/email/send", () => ({ sendEmail: h.sendEmail }));

const { inviteBusiness } = await import("./invite");

const ADMIN = "a0000000-0000-4000-8000-000000000001";

function insertCall(): Call {
  return h.calls.find((c) => c.text.includes("business_invitations"))!;
}

beforeEach(() => {
  h.calls.length = 0;
  h.sendEmail.mockReset();
  h.sendEmail.mockResolvedValue({ id: "x" });
});

describe("inviteBusiness · billing_mode", () => {
  it("standard är 'app' utan anteckning", async () => {
    const r = await inviteBusiness(ADMIN, {
      email: "duena@example.com",
      businessName: "Barbería",
      plan: "free",
    });
    expect(r).toEqual({ ok: true, invitationId: "inv-1" });
    expect(insertCall().values.slice(6)).toEqual(["app", null]);
  });

  it("'manual' + anteckning följer med och loggas utan anteckningstexten", async () => {
    await inviteBusiness(ADMIN, {
      email: "duena@example.com",
      businessName: "Barbería",
      plan: "equipo",
      billingMode: "manual",
      billingNote: "  Factura anual  ",
    });
    expect(insertCall().values.slice(6)).toEqual(["manual", "Factura anual"]);
    const audit = h.calls.find((c) => c.text.includes("admin_audit_log"))!;
    const details = String(audit.values[4]);
    expect(JSON.parse(details)).toEqual({
      invitation_id: "inv-1",
      plan: "equipo",
      billing_mode: "manual",
    });
  });

  it("för lång anteckning → note_too_long, inget sparas", async () => {
    const r = await inviteBusiness(ADMIN, {
      email: "duena@example.com",
      businessName: "Barbería",
      plan: "free",
      billingMode: "manual",
      billingNote: "x".repeat(501),
    });
    expect(r).toEqual({ ok: false, code: "note_too_long" });
    expect(h.calls).toEqual([]);
  });

  it("ogiltigt läge → invalid_input", async () => {
    const r = await inviteBusiness(ADMIN, {
      email: "duena@example.com",
      businessName: "Barbería",
      plan: "free",
      billingMode: "stripe" as never,
    });
    expect(r).toEqual({ ok: false, code: "invalid_input" });
  });
});
