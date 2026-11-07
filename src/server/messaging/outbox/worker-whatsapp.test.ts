import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WhatsAppSendError } from "@/server/messaging/whatsapp/errors";

/**
 * D-063: workerns kanalval vid sändningen och e-postreserven, utan riktig
 * databas (fejkad `Queryable` som matchar på SQL-formen, samma idé som
 * `worker.test.ts`). `sendEmail` och `sendWhatsAppTemplate` mockas — aldrig
 * ett skarpt anrop.
 */

type Row = Record<string, unknown>;
type QueryCall = { text: string; values: readonly unknown[] };

class FakeDb {
  readonly calls: QueryCall[] = [];
  claimRows: Row[] = [];
  contextRow: Row | undefined;
  waitlistRow: Row | undefined;
  consent: boolean | undefined;

  async query<R extends object = Row>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<{ rows: R[]; rowCount: number }> {
    this.calls.push({ text, values });
    if (/with next as/.test(text)) {
      const rows = this.claimRows as unknown as R[];
      this.claimRows = [];
      return { rows, rowCount: rows.length };
    }
    if (/from public\.consent_events/.test(text)) {
      const rows = (this.consent === undefined
        ? []
        : [{ granted: this.consent }]) as unknown as R[];
      return { rows, rowCount: rows.length };
    }
    if (/from public\.bookings bk/.test(text)) {
      const rows = (this.contextRow ? [this.contextRow] : []) as unknown as R[];
      return { rows, rowCount: rows.length };
    }
    if (/from public\.waitlist_entries we/.test(text)) {
      const rows = (this.waitlistRow
        ? [this.waitlistRow]
        : []) as unknown as R[];
      return { rows, rowCount: rows.length };
    }
    return { rows: [] as R[], rowCount: 1 };
  }

  updates(re: RegExp): QueryCall[] {
    return this.calls.filter(
      (c) =>
        /^\s*update public\.message_outbox/.test(c.text) &&
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
const sendWhatsAppMock = vi.fn(
  async (): Promise<{ provider: "meta" | "fake"; id: string }> => ({
    provider: "meta",
    id: "wamid.TEST1",
  }),
);

vi.mock("@/server/db/tx", () => ({
  withServiceTx: async <T>(fn: (q: FakeDb) => Promise<T>) => fn(db),
}));
vi.mock("@/server/messaging/email", () => ({
  sendEmail: (...args: unknown[]) =>
    (sendEmailMock as (...a: unknown[]) => unknown)(...args),
}));
vi.mock("@/server/messaging/whatsapp/client", () => ({
  sendWhatsAppTemplate: (...args: unknown[]) =>
    (sendWhatsAppMock as (...a: unknown[]) => unknown)(...args),
}));

const { processOutbox } = await import("./worker");

const BIZ = "b0000000-0000-4000-8000-000000000001";
const BOOKING = "b0000000-0000-4000-8000-0000000000aa";
const CUSTOMER = "c0000000-0000-4000-8000-0000000000cc";
const TOKEN = "T".repeat(43);
const START_MS = Date.parse("2026-11-06T18:00:00Z"); // vie 6 nov 15:00 CLT
const ALL_APPROVED =
  "reserva_confirmada,recordatorio_24h,reserva_cancelada,reserva_movida,lista_espera_oferta,lista_espera_tomada";

function contextRow(overrides: Row = {}): Row {
  return {
    booking_status: "confirmed",
    start_ms: START_MS,
    price_clp: 12000,
    discount_clp: 0,
    discount_is_offer: false,
    negocio: "Barbería Norte",
    negocio_telefono: null,
    slug: "barberia-norte",
    address: null,
    cancel_window_hours: 4,
    customer_id: CUSTOMER,
    cliente: "Joaquín Pérez",
    phone_e164: "+56912345678",
    email: "joaquin@example.cl",
    servicio: "Corte + barba",
    profesional: "Diego",
    ...overrides,
  };
}

function claimRow(overrides: Row = {}): Row {
  return {
    id: "m0000000-0000-4000-8000-000000000001",
    business_id: BIZ,
    booking_id: BOOKING,
    channel: "email",
    recipient_kind: "customer",
    template: "reservaConfirmada",
    payload: { token: TOKEN },
    attempts: 1,
    dedupe_key: "reservaConfirmada:email:customer:x:1",
    fallback_reason: null,
    waitlist_entry_id: null,
    ...overrides,
  };
}

beforeEach(() => {
  db = new FakeDb();
  sendEmailMock.mockClear();
  sendWhatsAppMock.mockReset();
  sendWhatsAppMock.mockResolvedValue({ provider: "meta", id: "wamid.TEST1" });
  vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "");
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "");
  vi.stubEnv("WHATSAPP_FAKE", "1");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("WHATSAPP_TEMPLATES_APPROVED", ALL_APPROVED);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("kanalval vid sändningen", () => {
  it("samtycke + chilenskt mobilnr + godkänd mall → WhatsApp, ingen e-post", async () => {
    db.claimRows = [claimRow()];
    db.contextRow = contextRow();
    db.consent = true;
    const r = await processOutbox();
    expect(r.sent).toBe(1);
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(sendWhatsAppMock).toHaveBeenCalledTimes(1);
    const [input] = sendWhatsAppMock.mock.calls[0] as unknown as [
      { to: string; template: { name: string; components: unknown[] } },
    ];
    expect(input.to).toBe("+56912345678");
    expect(input.template.name).toBe("reserva_confirmada");
    // Parametrarna i kontraktets ordning, förnamnet (första ordet).
    expect(input.template.components[0]).toEqual({
      type: "body",
      parameters: [
        "Barbería Norte",
        "Joaquín",
        "Corte + barba",
        "viernes 6 de noviembre",
        "15:00",
        "Diego",
        "4",
      ].map((text) => ({ type: "text", text })),
    });
    expect(input.template.components[1]).toEqual({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: TOKEN }],
    });
    // Skickad: kanalen whatsapp, wamid sparat, payload (token) KVAR för reserven.
    const sent = db.updates(/set status = 'sent'/);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.text).toMatch(/channel = 'whatsapp'/);
    expect(sent[0]!.text).toMatch(/wa_message_id = \$3/);
    expect(sent[0]!.text).not.toMatch(/payload = '\{\}'/);
    expect(sent[0]!.values[2]).toBe("wamid.TEST1");
  });

  it("utan samtycke → e-post", async () => {
    db.claimRows = [claimRow()];
    db.contextRow = contextRow();
    db.consent = undefined;
    await processOutbox();
    expect(sendWhatsAppMock).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("återkallat samtycke (senaste händelsen granted=false) → e-post", async () => {
    db.claimRows = [claimRow()];
    db.contextRow = contextRow();
    db.consent = false;
    await processOutbox();
    expect(sendWhatsAppMock).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("mallen inte godkänd (URL-mall utan domän) → e-post, samtycket slås inte ens upp", async () => {
    vi.stubEnv(
      "WHATSAPP_TEMPLATES_APPROVED",
      "recordatorio_24h,lista_espera_oferta,lista_espera_tomada",
    );
    db.claimRows = [claimRow()];
    db.contextRow = contextRow();
    db.consent = true;
    await processOutbox();
    expect(sendWhatsAppMock).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(db.calls.some((c) => /consent_events/.test(c.text))).toBe(false);
  });

  it("WhatsApp inte konfigurerat (inga nycklar, ingen fake) → e-post", async () => {
    vi.stubEnv("WHATSAPP_FAKE", "");
    db.claimRows = [claimRow()];
    db.contextRow = contextRow();
    db.consent = true;
    await processOutbox();
    expect(sendWhatsAppMock).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it.each(["+56223456789", "+5491112345678"])(
    "inte ett chilenskt mobilnummer (%s) → e-post",
    async (phone) => {
      db.claimRows = [claimRow()];
      db.contextRow = contextRow({ phone_e164: phone });
      db.consent = true;
      await processOutbox();
      expect(sendWhatsAppMock).not.toHaveBeenCalled();
      expect(sendEmailMock).toHaveBeenCalledTimes(1);
    },
  );

  it("en whatsapp-köad rad vars samtycke återkallats byter till e-post", async () => {
    db.claimRows = [claimRow({ channel: "whatsapp" })];
    db.contextRow = contextRow();
    db.consent = false;
    await processOutbox();
    expect(sendWhatsAppMock).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(db.updates(/set channel = 'email'/)).toHaveLength(1);
  });

  it("en whatsapp-köad rad utan samtycke och utan e-post avbryts", async () => {
    db.claimRows = [claimRow({ channel: "whatsapp" })];
    db.contextRow = contextRow({ email: null });
    db.consent = false;
    const r = await processOutbox();
    expect(r.cancelled).toBe(1);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("raden har redan fallit tillbaka (fallback_reason) → aldrig WhatsApp igen", async () => {
    db.claimRows = [claimRow({ fallback_reason: "wa_131026" })];
    db.contextRow = contextRow();
    db.consent = true;
    await processOutbox();
    expect(sendWhatsAppMock).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("ägarmejl påverkas inte (alltid e-post)", async () => {
    db.claimRows = [
      claimRow({ recipient_kind: "owner", template: "nuevaReservaDueno" }),
    ];
    db.contextRow = contextRow();
    db.consent = true;
    await processOutbox();
    expect(sendWhatsAppMock).not.toHaveBeenCalled();
  });
});

describe("fel och reserv till e-post", () => {
  it("permanent fel (131026, inte på WhatsApp) → e-post i samma pass, fallback_reason satt", async () => {
    sendWhatsAppMock.mockRejectedValue(
      new WhatsAppSendError("permanent", "wa_131026"),
    );
    db.claimRows = [claimRow()];
    db.contextRow = contextRow();
    db.consent = true;
    const r = await processOutbox();
    expect(r.sent).toBe(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const sw = db.updates(/fallback_reason = \$3/);
    expect(sw).toHaveLength(1);
    expect(sw[0]!.values[2]).toBe("wa_131026");
  });

  it("permanent fel utan e-post → dead direkt (inga fler försök)", async () => {
    sendWhatsAppMock.mockRejectedValue(
      new WhatsAppSendError("permanent", "wa_132001"),
    );
    db.claimRows = [claimRow()];
    db.contextRow = contextRow({ email: null });
    db.consent = true;
    const r = await processOutbox();
    expect(r.dead).toBe(1);
    expect(sendEmailMock).not.toHaveBeenCalled();
    const dead = db.updates(/set status = 'dead'/);
    expect(dead[0]!.values[2]).toBe("wa_132001");
  });

  it("tillfälligt fel (rate limit) → backoff, ingen e-post än", async () => {
    sendWhatsAppMock.mockRejectedValue(
      new WhatsAppSendError("temporary", "wa_130429"),
    );
    db.claimRows = [claimRow({ attempts: 1 })];
    db.contextRow = contextRow();
    db.consent = true;
    const r = await processOutbox();
    expect(r.queued).toBe(1);
    expect(sendEmailMock).not.toHaveBeenCalled();
    const q = db.updates(/set status = 'queued'/);
    expect(q[0]!.values[2]).toBe("wa_130429");
  });

  it("tillfälligt fel på sista försöket → e-post i stället för dead", async () => {
    sendWhatsAppMock.mockRejectedValue(
      new WhatsAppSendError("temporary", "http_503"),
    );
    db.claimRows = [claimRow({ attempts: 5 })];
    db.contextRow = contextRow();
    db.consent = true;
    const r = await processOutbox();
    expect(r.sent).toBe(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });
});

describe("mallarna per händelse", () => {
  it("recordatorio → recordatorio_24h med Confirmo/Necesito cambiar", async () => {
    db.claimRows = [claimRow({ template: "recordatorio" })];
    db.contextRow = contextRow();
    db.consent = true;
    await processOutbox();
    const [input] = sendWhatsAppMock.mock.calls[0] as unknown as [
      { template: { name: string; components: unknown[] } },
    ];
    expect(input.template.name).toBe("recordatorio_24h");
    expect(input.template.components.slice(1)).toEqual([
      {
        type: "button",
        sub_type: "quick_reply",
        index: "0",
        parameters: [{ type: "payload", payload: "confirmo" }],
      },
      {
        type: "button",
        sub_type: "quick_reply",
        index: "1",
        parameters: [{ type: "payload", payload: "cambiar" }],
      },
    ]);
  });

  it("reservaMovida utan token (kan inte bygga knappen) → e-post", async () => {
    db.claimRows = [claimRow({ template: "reservaMovida", payload: {} })];
    db.contextRow = contextRow();
    db.consent = true;
    await processOutbox();
    expect(sendWhatsAppMock).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("listaEsperaTomada → lista_espera_tomada, posten hittas via waitlist_entry_id när payload tömts", async () => {
    db.claimRows = [
      claimRow({
        booking_id: null,
        template: "listaEsperaTomada",
        payload: {},
        waitlist_entry_id: "e0000000-0000-4000-8000-0000000000ee",
      }),
    ];
    db.waitlistRow = {
      day: "2026-11-07",
      sendable: true,
      customer_id: CUSTOMER,
      cliente: "Joaquín Pérez",
      phone_e164: "+56912345678",
      email: null,
      negocio: "Barbería Norte",
    };
    db.consent = true;
    const r = await processOutbox();
    expect(r.sent).toBe(1);
    const [input] = sendWhatsAppMock.mock.calls[0] as unknown as [
      { template: { name: string; components: unknown[] } },
    ];
    expect(input.template.name).toBe("lista_espera_tomada");
    expect(input.template.components).toEqual([
      {
        type: "body",
        parameters: ["Barbería Norte", "Joaquín", "sábado 7 de noviembre"].map(
          (text) => ({ type: "text", text }),
        ),
      },
    ]);
  });
});
