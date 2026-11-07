import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  fromLocal,
  SANTIAGO,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";
import { createBooking } from "@/server/bookings/__fixtures__/flat";
import {
  loadBookingByToken,
  revokeWhatsAppByToken,
} from "@/server/bookings/manage";
import { saveBookingConsent } from "@/server/bookings/submit";
import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  dropTestBusiness,
  type TestBusiness,
} from "@/server/db/testing";
import {
  fakeWhatsAppOutbox,
  resetFakeWhatsAppOutbox,
} from "@/server/messaging/whatsapp/client";
import { resetFakeEmailOutbox } from "@/server/messaging/email";

import { processOutbox } from "./worker";

/**
 * D-063 mot lokal databas: bokningsmotorn köar → workern väljer kanal vid
 * sändningen → fake-WhatsApp, och samtycket (ges i Reserva, återkallas via
 * `/r/[token]`) styr kanalen. URL-mallarna går som e-post tills de står i
 * `WHATSAPP_TEMPLATES_APPROVED`.
 */

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();
const TUE = "2027-03-02";
const NOW = new Date(at("2027-02-25", "09:00"));
const customerActor = { kind: "customer" as const };

let biz: TestBusiness;

function phone(): string {
  return `+569${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
}

async function rowsFor(bookingId: string) {
  const r = await adminQuery<{
    template: string;
    channel: string;
    status: string;
    wa_message_id: string | null;
    payload: Record<string, unknown>;
  }>(
    `select template, channel::text as channel, status::text as status,
            wa_message_id, payload
       from public.message_outbox
      where business_id = $1 and booking_id = $2 and recipient_kind = 'customer'
      order by created_at, template`,
    [biz.id, bookingId],
  );
  return r.rows;
}

async function book(time: string, customerPhone: string) {
  const r = await createBooking({
    businessId: biz.id,
    serviceId: biz.services.corte!,
    staffId: biz.staff.diego!,
    start: new Date(at(TUE, time)).toISOString(),
    customer: {
      phone: customerPhone,
      name: "Ana Rojas",
      email: "ana@example.cl",
    },
    source: "web",
    actor: customerActor,
    now: NOW,
  });
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness({ staff: [{ key: "diego" }] });
  await adminQuery(
    `update public.businesses set auto_confirm_bookings = true where id = $1`,
    [biz.id],
  );
});

beforeEach(() => {
  vi.stubEnv("WHATSAPP_FAKE", "1");
  vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "");
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("RESEND_API_KEY", "");
  resetFakeWhatsAppOutbox();
  resetFakeEmailOutbox();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await closePool();
});

describe("kanalvalet genom hela kedjan", () => {
  it("samtycke + godkända mallar → bekräftelse på WhatsApp (fake), påminnelsen köad på WhatsApp", async () => {
    vi.stubEnv(
      "WHATSAPP_TEMPLATES_APPROVED",
      "reserva_confirmada,recordatorio_24h,reserva_cancelada",
    );
    const p = phone();
    // Samtycket finns redan (tidigare bokning) → köningen väljer WhatsApp.
    const first = await book("10:00", p);
    await saveBookingConsent({
      businessId: biz.id,
      customerId: first.customerId,
      marketing: false,
      whatsapp: true,
      consentVersion: "x",
      now: NOW,
    });
    const b = await book("12:00", p);
    const queued = await rowsFor(b.id);
    expect(queued.map((r) => `${r.template}:${r.channel}`).sort()).toEqual([
      "recordatorio:whatsapp",
      "reservaConfirmada:whatsapp",
    ]);

    await processOutbox({ limit: 50 });
    const sent = (await rowsFor(b.id)).find(
      (r) => r.template === "reservaConfirmada",
    )!;
    expect(sent.status).toBe("sent");
    expect(sent.channel).toBe("whatsapp");
    expect(sent.wa_message_id).toMatch(/^fake_wa_/);
    // Token kvar till leveransstatus (e-postreserven).
    expect(typeof sent.payload.token).toBe("string");
    const msg = fakeWhatsAppOutbox().find((m) => m.id === sent.wa_message_id);
    expect(msg?.template.name).toBe("reserva_confirmada");
    expect(msg?.toMasked).not.toContain(p.slice(4));
  });

  it("samtycket sparas EFTER köningen (som i Reserva) → workern byter till WhatsApp vid sändningen", async () => {
    vi.stubEnv("WHATSAPP_TEMPLATES_APPROVED", "reserva_confirmada");
    const p = phone();
    const b = await book("14:00", p);
    expect(
      (await rowsFor(b.id)).find((r) => r.template === "reservaConfirmada")
        ?.channel,
    ).toBe("email");
    await saveBookingConsent({
      businessId: biz.id,
      customerId: b.customerId,
      marketing: false,
      whatsapp: true,
      consentVersion: "x",
      now: NOW,
    });
    await processOutbox({ limit: 50 });
    const row = (await rowsFor(b.id)).find(
      (r) => r.template === "reservaConfirmada",
    )!;
    expect(row).toMatchObject({ channel: "whatsapp", status: "sent" });
  });

  it("URL-mall inte godkänd (domän saknas) → e-post trots samtycke", async () => {
    vi.stubEnv(
      "WHATSAPP_TEMPLATES_APPROVED",
      "recordatorio_24h,lista_espera_oferta,lista_espera_tomada",
    );
    const p = phone();
    const b = await book("15:00", p);
    await saveBookingConsent({
      businessId: biz.id,
      customerId: b.customerId,
      marketing: false,
      whatsapp: true,
      consentVersion: "x",
      now: NOW,
    });
    await processOutbox({ limit: 50 });
    const rows = await rowsFor(b.id);
    expect(rows.find((r) => r.template === "reservaConfirmada")).toMatchObject({
      channel: "email",
      status: "sent",
    });
  });

  it("utan ikryssad ruta loggas inget samtycke, och ett nej återkallar inte ett tidigare ja", async () => {
    const p = phone();
    const b = await book("16:00", p);
    await saveBookingConsent({
      businessId: biz.id,
      customerId: b.customerId,
      marketing: false,
      whatsapp: false,
      consentVersion: "x",
      now: NOW,
    });
    const count = async () =>
      (
        await adminQuery<{ n: number }>(
          `select count(*)::int as n from public.consent_events
            where business_id = $1 and customer_id = $2 and kind = 'whatsapp'`,
          [biz.id, b.customerId],
        )
      ).rows[0]!.n;
    expect(await count()).toBe(0);
    await saveBookingConsent({
      businessId: biz.id,
      customerId: b.customerId,
      marketing: false,
      whatsapp: true,
      consentVersion: "x",
      now: NOW,
    });
    await saveBookingConsent({
      businessId: biz.id,
      customerId: b.customerId,
      marketing: false,
      whatsapp: false,
      consentVersion: "x",
      now: NOW,
    });
    expect(await count()).toBe(1);
  });
});

describe("återkallelse via /r/[token]", () => {
  it("kunden återkallar → loggas granted=false, och nästa meddelande går som e-post", async () => {
    vi.stubEnv(
      "WHATSAPP_TEMPLATES_APPROVED",
      "reserva_confirmada,recordatorio_24h,reserva_cancelada",
    );
    const p = phone();
    const b = await book("17:00", p);
    await saveBookingConsent({
      businessId: biz.id,
      customerId: b.customerId,
      marketing: false,
      whatsapp: true,
      consentVersion: "x",
      now: NOW,
    });
    const before = await loadBookingByToken(b.manageToken, NOW);
    expect(before?.whatsappConsent).toBe(true);

    const r = await revokeWhatsAppByToken(b.manageToken);
    expect(r).toEqual({ ok: true, value: { revoked: true } });
    // Idempotent: andra gången loggas inget nytt.
    expect(await revokeWhatsAppByToken(b.manageToken)).toEqual({
      ok: true,
      value: { revoked: false },
    });
    const after = await loadBookingByToken(b.manageToken, NOW);
    expect(after?.whatsappConsent).toBe(false);
    const events = await adminQuery<{ granted: boolean }>(
      `select granted from public.consent_events
        where business_id = $1 and customer_id = $2 and kind = 'whatsapp'
        order by created_at`,
      [biz.id, b.customerId],
    );
    expect(events.rows.map((e) => e.granted)).toEqual([true, false]);

    // Raden som redan köats som WhatsApp går nu som e-post.
    await processOutbox({ limit: 50 });
    const conf = (await rowsFor(b.id)).find(
      (x) => x.template === "reservaConfirmada",
    )!;
    expect(conf).toMatchObject({ channel: "email", status: "sent" });
  });

  it("okänd token → not_found", async () => {
    expect(await revokeWhatsAppByToken("A".repeat(43))).toEqual({
      ok: false,
      error: "not_found",
    });
  });
});
