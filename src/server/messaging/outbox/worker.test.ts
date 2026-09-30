import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * WP-16 steg 2: workerns backoff/dead/idempotens och sändningsdispatch, utan
 * en riktig databas. `withServiceTx` mockas till en fejkad `Queryable` som
 * matchar på SQL-formen (claim/kontext/owner_emails/finalize) — samma idé
 * som `enqueue.test.ts`. `sendEmail`/`sendSms` mockas helt (aldrig ett
 * skarpt anrop från en agent/test).
 */

type Row = Record<string, unknown>;
type QueryCall = { text: string; values: readonly unknown[] };

type RawClaimRow = {
  id: string;
  business_id: string;
  booking_id: string | null;
  channel: "email" | "sms";
  recipient_kind: "customer" | "owner" | "invitee";
  template: string;
  payload: Record<string, unknown>;
  attempts: number;
  dedupe_key: string;
};

type RawInvitationContextRow = {
  email: string;
  negocio: string;
  is_pending: boolean;
};

type RawContextRow = {
  booking_status: string;
  start_ms: number;
  price_clp: number;
  discount_clp: number;
  negocio: string;
  slug: string;
  address: string | null;
  cancel_window_hours: number;
  cliente: string;
  phone_e164: string;
  email: string | null;
  servicio: string;
  profesional: string;
};

class FakeDb {
  readonly calls: QueryCall[] = [];
  claimRows: RawClaimRow[] = [];
  contextRow: RawContextRow | undefined;
  ownerEmails: string[] = [];
  invitationContextRow: RawInvitationContextRow | undefined;

  async query<R extends object = Row>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<{ rows: R[]; rowCount: number }> {
    this.calls.push({ text, values });
    if (/set status = 'queued'\s+where status = 'sending'/.test(text)) {
      return { rows: [] as R[], rowCount: 0 };
    }
    if (/with next as/.test(text)) {
      const rows = this.claimRows as unknown as R[];
      this.claimRows = [];
      return { rows, rowCount: rows.length };
    }
    if (/from public\.bookings bk/.test(text)) {
      const rows = (this.contextRow ? [this.contextRow] : []) as unknown as R[];
      return { rows, rowCount: rows.length };
    }
    if (/private\.owner_emails/.test(text)) {
      const rows = this.ownerEmails.map((email) => ({
        email,
      })) as unknown as R[];
      return { rows, rowCount: rows.length };
    }
    if (/from public\.member_invitations mi/.test(text)) {
      const rows = (
        this.invitationContextRow ? [this.invitationContextRow] : []
      ) as unknown as R[];
      return { rows, rowCount: rows.length };
    }
    // Finalize-uppdateringarna (sent/queued/dead/cancelled): inget att läsa.
    return { rows: [] as R[], rowCount: 1 };
  }

  /** Finalize-uppdateringarna bara (utesluter den ovillkorliga
   * "sending"-svepningen i varje `claimBatch`, som också nämner `'queued'`). */
  updatesMatching(re: RegExp): QueryCall[] {
    return this.calls.filter(
      (c) =>
        /^update public\.message_outbox/.test(c.text) &&
        /where id = \$1 and business_id = \$2/.test(c.text) &&
        re.test(c.text),
    );
  }
}

let db: FakeDb;
const sendEmailMock = vi.fn(async () => ({
  provider: "fake" as const,
  id: "email-1",
  rendered: { subject: "", preheader: "", html: "", text: "" },
}));
const sendSmsMock = vi.fn(async () => ({
  provider: "fake" as const,
  id: "sms-1",
  text: "x",
}));

vi.mock("@/server/db/tx", () => ({
  withServiceTx: async <T>(fn: (q: FakeDb) => Promise<T>) => fn(db),
}));
vi.mock("@/server/messaging/email", () => ({
  sendEmail: (...args: unknown[]) =>
    (sendEmailMock as (...a: unknown[]) => unknown)(...args),
}));
vi.mock("@/server/messaging/sms", () => ({
  sendSms: (...args: unknown[]) =>
    (sendSmsMock as (...a: unknown[]) => unknown)(...args),
}));

const { nextRetry, processOutbox } = await import("./worker");

const BIZ = "b0000000-0000-4000-8000-000000000001";
const BOOKING = "b0000000-0000-4000-8000-0000000000aa";
const START_MS = Date.now() + 2 * 60 * 60 * 1000;

function contextRow(overrides: Partial<RawContextRow> = {}): RawContextRow {
  return {
    booking_status: "confirmed",
    start_ms: START_MS,
    price_clp: 12000,
    discount_clp: 0,
    negocio: "Barbería Norte",
    slug: "barberia-norte",
    address: "Av. Providencia 1234",
    cancel_window_hours: 3,
    cliente: "Joaquín",
    phone_e164: "+56912345678",
    email: "joaquin@example.cl",
    servicio: "Corte",
    profesional: "Diego",
    ...overrides,
  };
}

function claimRow(overrides: Partial<RawClaimRow> = {}): RawClaimRow {
  return {
    id: "m0000000-0000-4000-8000-000000000001",
    business_id: BIZ,
    booking_id: BOOKING,
    channel: "email",
    recipient_kind: "customer",
    template: "reservaConfirmada",
    payload: { token: "T".repeat(43) },
    attempts: 1,
    dedupe_key: "reservaConfirmada:email:customer:x:1",
    ...overrides,
  };
}

beforeEach(() => {
  db = new FakeDb();
  sendEmailMock.mockClear();
  sendSmsMock.mockClear();
});

describe("nextRetry (backoff 1/5/15/60, dead efter 5)", () => {
  it.each([
    [1, 1],
    [2, 5],
    [3, 15],
    [4, 60],
  ])("attempts=%d → köas igen om %d min", (attempts, minutes) => {
    expect(nextRetry(attempts)).toEqual({
      status: "queued",
      delayMinutes: minutes,
    });
  });

  it("attempts=5 → dead", () => {
    expect(nextRetry(5)).toEqual({ status: "dead" });
  });

  it("attempts>5 (skyddsnät) → fortfarande dead", () => {
    expect(nextRetry(9)).toEqual({ status: "dead" });
  });
});

describe("processOutbox: claim → skicka → avsluta", () => {
  it("inga rader: allt noll, inget skickas", async () => {
    db.contextRow = contextRow();
    const result = await processOutbox({ limit: 25 });
    expect(result).toEqual({
      claimed: 0,
      sent: 0,
      cancelled: 0,
      queued: 0,
      dead: 0,
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("lyckad e-post till kunden: sent, payload tömd, dedupe_key som idempotencyKey", async () => {
    db.claimRows = [claimRow()];
    db.contextRow = contextRow();
    const result = await processOutbox({ limit: 25 });
    expect(result).toEqual({
      claimed: 1,
      sent: 1,
      cancelled: 0,
      queued: 0,
      dead: 0,
    });
    expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        to: "joaquin@example.cl",
        template: "reservaConfirmada",
        idempotencyKey: "reservaConfirmada:email:customer:x:1",
      }),
    );
    const sent = db.updatesMatching(/status = 'sent'/);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.values).toEqual([claimRow().id, BIZ, "email-1"]);
  });

  it("kund via sms: länken och texten byggs, sendSms anropas", async () => {
    db.claimRows = [
      claimRow({
        channel: "sms",
        dedupe_key: "reservaConfirmada:sms:customer:x:1",
      }),
    ];
    db.contextRow = contextRow();
    await processOutbox({ limit: 25 });
    expect(sendSmsMock).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        to: "+56912345678",
        template: "reservaConfirmada",
        data: expect.objectContaining({ negocio: "Barbería Norte" }),
      }),
    );
  });

  it("ägaren: en sändning per e-post, egen idempotencyKey-suffix", async () => {
    db.claimRows = [
      claimRow({
        recipient_kind: "owner",
        template: "nuevaReservaDueno",
        payload: {},
        dedupe_key: "nuevaReservaDueno:email:owner:x:1",
      }),
    ];
    db.contextRow = contextRow();
    db.ownerEmails = ["a@negocio.cl", "b@negocio.cl"];
    const result = await processOutbox({ limit: 25 });
    expect(result.sent).toBe(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(sendEmailMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: "a@negocio.cl",
        idempotencyKey: "nuevaReservaDueno:email:owner:x:1:o0",
      }),
    );
    expect(sendEmailMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        to: "b@negocio.cl",
        idempotencyKey: "nuevaReservaDueno:email:owner:x:1:o1",
      }),
    );
  });

  it("recordatorio för en bokning som inte längre är confirmed: cancelled, aldrig skickad", async () => {
    db.claimRows = [
      claimRow({
        template: "recordatorio",
        dedupe_key: "recordatorio:email:customer:x:1",
      }),
    ];
    db.contextRow = contextRow({ booking_status: "cancelled" });
    const result = await processOutbox({ limit: 25 });
    expect(result).toEqual({
      claimed: 1,
      sent: 0,
      cancelled: 1,
      queued: 0,
      dead: 0,
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(db.updatesMatching(/status = 'cancelled'/)).toHaveLength(1);
  });

  it.each([
    ["solicitudRecibida", "customer", "confirmed"],
    ["solicitudRecibida", "customer", "cancelled"],
    ["nuevaSolicitud", "owner", "cancelled"],
  ] as const)(
    "%s (%s) när bokningen är %s: cancelled, aldrig skickad (WP-45)",
    async (template, recipient, status) => {
      db.claimRows = [
        claimRow({
          template,
          recipient_kind: recipient,
          dedupe_key: `${template}:email:${recipient}:x:1`,
        }),
      ];
      db.contextRow = contextRow({ booking_status: status });
      db.ownerEmails = ["a@negocio.cl"];
      const result = await processOutbox({ limit: 25 });
      expect(result).toMatchObject({ claimed: 1, sent: 0, cancelled: 1 });
      expect(sendEmailMock).not.toHaveBeenCalled();
    },
  );

  it("fel (attempts=1): status='queued', backoff 1 min, felkod utan persondata", async () => {
    sendEmailMock.mockRejectedValueOnce(
      new Error("Resend: skicka misslyckades (HTTP 500)"),
    );
    db.claimRows = [claimRow({ attempts: 1 })];
    db.contextRow = contextRow();
    const result = await processOutbox({ limit: 25 });
    expect(result).toEqual({
      claimed: 1,
      sent: 0,
      cancelled: 0,
      queued: 1,
      dead: 0,
    });
    const failed = db.updatesMatching(/status = 'queued'/);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.values).toEqual([claimRow().id, BIZ, "http_500", 1]);
  });

  it("fel (attempts=5): status='dead'", async () => {
    sendEmailMock.mockRejectedValueOnce(new Error("boom"));
    db.claimRows = [claimRow({ attempts: 5 })];
    db.contextRow = contextRow();
    const result = await processOutbox({ limit: 25 });
    expect(result).toEqual({
      claimed: 1,
      sent: 0,
      cancelled: 0,
      queued: 0,
      dead: 1,
    });
    expect(db.updatesMatching(/status = 'dead'/)).toHaveLength(1);
    // D-029: kundens token töms även när raden ger upp.
    expect(
      db.updatesMatching(/status = 'dead'.*payload = '\{\}'::jsonb/s),
    ).toHaveLength(1);
  });

  it("kundens e-post saknas (rad köad som e-post men kunden saknar en nu): fel, ingen krasch", async () => {
    db.claimRows = [claimRow()];
    db.contextRow = contextRow({ email: null });
    const result = await processOutbox({ limit: 25 });
    expect(result.queued).toBe(1);
    expect(sendEmailMock).not.toHaveBeenCalled();
    const failed = db.updatesMatching(/status = 'queued'/);
    expect(failed[0]!.values).toEqual([claimRow().id, BIZ, "no_email", 1]);
  });

  it("bookingId begränsar claim-frågan (kickOutbox)", async () => {
    db.contextRow = contextRow();
    await processOutbox({ limit: 10, bookingId: BOOKING });
    const claim = db.calls.find((c) => /with next as/.test(c.text));
    expect(claim?.text).toContain("booking_id = $2");
    expect(claim?.values).toEqual([10, BOOKING]);
  });
});

describe("processOutbox: invitee (WP-46, D-034)", () => {
  const INVITATION = "i0000000-0000-4000-8000-000000000001";

  function inviteeClaimRow(
    overrides: Partial<RawClaimRow> = {},
  ): RawClaimRow {
    return claimRow({
      booking_id: null,
      recipient_kind: "invitee",
      template: "invitacionEquipo",
      payload: {
        invitationId: INVITATION,
        token: "T".repeat(43),
        invitadoPor: "María Dueña",
      },
      dedupe_key: "invitacionEquipo:email:invitee:i0:hash1",
      ...overrides,
    });
  }

  function invitationContextRow(
    overrides: Partial<RawInvitationContextRow> = {},
  ): RawInvitationContextRow {
    return {
      email: "nuevo@example.com",
      negocio: "Barbería Norte",
      is_pending: true,
      ...overrides,
    };
  }

  it("lyckad inbjudan: adressen/negocio slås upp vía invitationId (nunca en el payload), acceptUrl construido con el token, payload vaciado", async () => {
    db.claimRows = [inviteeClaimRow()];
    db.invitationContextRow = invitationContextRow();
    const result = await processOutbox({ limit: 25 });
    expect(result).toEqual({
      claimed: 1,
      sent: 1,
      cancelled: 0,
      queued: 0,
      dead: 0,
    });
    expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        to: "nuevo@example.com",
        template: "invitacionEquipo",
        data: {
          negocio: "Barbería Norte",
          invitadoPor: "María Dueña",
          acceptUrl: `http://127.0.0.1:3000/app/invitacion/${"T".repeat(43)}`,
        },
        idempotencyKey: "invitacionEquipo:email:invitee:i0:hash1",
      }),
    );
    // D-029: payload (token/invitationId/invitadoPor) tömd efter sändning.
    const sent = db.updatesMatching(/status = 'sent'.*payload = '\{\}'::jsonb/s);
    expect(sent).toHaveLength(1);
  });

  it("inbjudan redan accepterad/återkallad/utgången innan sändning: cancelled, aldrig skickad", async () => {
    db.claimRows = [inviteeClaimRow()];
    db.invitationContextRow = invitationContextRow({ is_pending: false });
    const result = await processOutbox({ limit: 25 });
    expect(result).toEqual({
      claimed: 1,
      sent: 0,
      cancelled: 1,
      queued: 0,
      dead: 0,
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(db.updatesMatching(/status = 'cancelled'/)).toHaveLength(1);
  });

  it("inbjudan borttagen/okänd: fel (ingen krasch), backoff som vanligt", async () => {
    db.claimRows = [inviteeClaimRow()];
    db.invitationContextRow = undefined;
    const result = await processOutbox({ limit: 25 });
    expect(result.queued).toBe(1);
    expect(sendEmailMock).not.toHaveBeenCalled();
    const failed = db.updatesMatching(/status = 'queued'/);
    expect(failed[0]!.values).toEqual([
      inviteeClaimRow().id,
      BIZ,
      "no_invitation",
      1,
    ]);
  });
});
