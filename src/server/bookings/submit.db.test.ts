import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  fromLocal,
  SANTIAGO,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";
import { LEGAL_VERSION } from "@/i18n/legal/types";
import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  dropTestBusiness,
  type TestBusiness,
} from "@/server/db/testing";

import { createCustomerBooking, saveBookingConsent } from "./submit";

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();
const iso = (ms: number) => new Date(ms).toISOString();
const TUE = "2026-10-06";
const NOW = new Date(at("2026-10-01", "09:00"));

let biz: TestBusiness;
let phoneSeq = 0;
const phone = () => `+5698${String(1_000_000 + ++phoneSeq).slice(-7)}`;

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness();
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await closePool();
});

async function consentRow(customerId: string) {
  const r = await adminQuery<{
    consent_terms_at: Date | null;
    consent_marketing_at: Date | null;
    consent_version: string | null;
    consent_channel: string | null;
  }>(
    `select consent_terms_at, consent_marketing_at, consent_version, consent_channel
       from public.customers where id = $1`,
    [customerId],
  );
  return r.rows[0]!;
}

describe("createCustomerBooking + saveBookingConsent", () => {
  it("skapar bokningen och sparar samtycket på kundraden (marketing accepterat)", async () => {
    const result = await createCustomerBooking({
      businessId: biz.id,
      serviceId: biz.services.corte!,
      staffId: biz.staff.diego!,
      start: iso(at(TUE, "11:00")),
      name: "Camila Rojas",
      phone: phone(),
      email: `c${phoneSeq}@example.com`,
      idempotencyKey: randomUUID(),
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("confirmed");

    const booking = await adminQuery<{ status: string; customer_id: string }>(
      "select status, customer_id from public.bookings where id = $1",
      [result.value.id],
    );
    expect(booking.rows[0]!.status).toBe("confirmed");

    await saveBookingConsent({
      businessId: biz.id,
      customerId: result.value.customerId,
      marketing: true,
      consentVersion: "2026-10-v1",
      now: NOW,
    });
    const consent = await consentRow(result.value.customerId);
    expect(consent.consent_terms_at).not.toBeNull();
    expect(consent.consent_marketing_at).not.toBeNull();
    // Säkerhetsgranskning WP-26 (punkt 10): customers.consent_version är
    // alltid LEGAL_VERSION (serverns), aldrig input.consentVersion (klientens).
    expect(consent.consent_version).toBe(LEGAL_VERSION);
    expect(consent.consent_channel).toBe("web");
  });

  it("marketing avmarkerat: consent_marketing_at förblir null", async () => {
    const result = await createCustomerBooking({
      businessId: biz.id,
      serviceId: biz.services.corte!,
      staffId: biz.staff.matias!,
      start: iso(at(TUE, "12:00")),
      name: "Ana Pérez",
      phone: phone(),
      email: `c${phoneSeq}@example.com`,
      idempotencyKey: randomUUID(),
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    await saveBookingConsent({
      businessId: biz.id,
      customerId: result.value.customerId,
      marketing: false,
      consentVersion: "2026-10-v1",
      now: NOW,
    });
    const consent = await consentRow(result.value.customerId);
    expect(consent.consent_terms_at).not.toBeNull();
    expect(consent.consent_marketing_at).toBeNull();
    expect(consent.consent_version).toBe(LEGAL_VERSION);
    expect(consent.consent_channel).toBe("web");
  });

  it("WP-26: samtycket loggas i consent_events (terms + marketing, LEGAL_VERSION, web)", async () => {
    const result = await createCustomerBooking({
      businessId: biz.id,
      serviceId: biz.services.corte!,
      staffId: biz.staff.diego!,
      start: iso(at(TUE, "13:00")),
      name: "Paula Soto",
      phone: phone(),
      email: `c${phoneSeq}@example.com`,
      idempotencyKey: randomUUID(),
      now: NOW,
    });
    if (!result.ok) throw new Error(result.error);

    await saveBookingConsent({
      businessId: biz.id,
      customerId: result.value.customerId,
      marketing: false,
      consentVersion: "2026-10-v1",
      now: NOW,
    });
    const events = await adminQuery<{
      business_id: string;
      subject: string;
      kind: string;
      version: string;
      channel: string;
      granted: boolean;
    }>(
      `select business_id, subject::text, kind::text, version, channel::text, granted
         from public.consent_events where customer_id = $1 order by consent_events.kind`,
      [result.value.customerId],
    );
    const base = {
      business_id: biz.id,
      subject: "customer",
      version: LEGAL_VERSION,
      channel: "web",
    };
    expect(events.rows).toEqual([
      { ...base, kind: "terms", granted: true },
      { ...base, kind: "marketing", granted: false },
    ]);
  });

  it("WP-26 (IDEAS 2026-09-28): publik bokning skriver inte över ägarens manual-samtycke", async () => {
    const ph = phone();
    const earlier = new Date("2026-09-01T12:00:00.000Z");
    const inserted = await adminQuery<{ id: string }>(
      `insert into public.customers
         (business_id, phone_e164, name, consent_terms_at, consent_version, consent_channel)
       values ($1, $2, 'Registro manual', $3, 'manual-2026-10-v1', 'manual')
       returning id`,
      [biz.id, ph, earlier.toISOString()],
    );
    const customerId = inserted.rows[0]!.id;

    const result = await createCustomerBooking({
      businessId: biz.id,
      serviceId: biz.services.corte!,
      staffId: biz.staff.matias!,
      start: iso(at(TUE, "13:00")),
      name: "Otra persona",
      phone: ph,
      email: `c${phoneSeq}@example.com`,
      idempotencyKey: randomUUID(),
      now: NOW,
    });
    if (!result.ok) throw new Error(result.error);
    expect(result.value.customerId).toBe(customerId);

    await saveBookingConsent({
      businessId: biz.id,
      customerId,
      marketing: true,
      consentVersion: "2026-10-v1",
      now: NOW,
    });
    const consent = await consentRow(customerId);
    expect(consent).toEqual({
      consent_terms_at: earlier,
      consent_marketing_at: null,
      consent_version: "manual-2026-10-v1",
      consent_channel: "manual",
    });
  });

  it("fel start (utanför öppettid): ingen ny kund skapas", async () => {
    const before = await adminQuery<{ n: string }>(
      "select count(*)::text as n from public.customers where business_id = $1",
      [biz.id],
    );
    const result = await createCustomerBooking({
      businessId: biz.id,
      serviceId: biz.services.corte!,
      staffId: biz.staff.diego!,
      start: iso(at(TUE, "23:00")),
      name: "Pedro Vidal",
      phone: phone(),
      email: `c${phoneSeq}@example.com`,
      idempotencyKey: randomUUID(),
      now: NOW,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("outside_hours");

    const after = await adminQuery<{ n: string }>(
      "select count(*)::text as n from public.customers where business_id = $1",
      [biz.id],
    );
    expect(after.rows[0]!.n).toBe(before.rows[0]!.n);
  });

  it("omförsök (samma idempotencyKey, exakt samma anrop): en bokning, samma svar; samtycket kan sparas på nytt", async () => {
    const request = {
      businessId: biz.id,
      serviceId: biz.services.corte!,
      staffId: biz.staff.tomas!,
      start: iso(at(TUE, "16:00")),
      name: "Joaquín Soto",
      phone: phone(),
      email: `c${phoneSeq}@example.com`,
      idempotencyKey: randomUUID(),
      now: NOW,
    };
    const first = await createCustomerBooking(request);
    if (!first.ok) throw new Error(first.error);
    const retry = await createCustomerBooking(request);
    if (!retry.ok) throw new Error(retry.error);
    // Samma bokning i allt utom manageToken (klartexten kan inte återskapas
    // vid en träff, se create.ts).
    expect(retry.value).toEqual({ ...first.value, manageToken: "" });

    // "Skrivs om vid ett idempotent omförsök" (granskningsfynd): samma
    // customerId, går att köra igen utan fel.
    await saveBookingConsent({
      businessId: biz.id,
      customerId: retry.value.customerId,
      marketing: true,
      consentVersion: "2026-10-v1",
      now: NOW,
    });
    const consent = await consentRow(retry.value.customerId);
    expect(consent.consent_terms_at).not.toBeNull();
  });

  it("pilotblockerare WP-27: max 3 framtida bokningar per telefon+företag, en avbokad räknas inte", async () => {
    const ph = phone();
    const at2 = (t: LocalTime) => iso(at(TUE, t));
    // Tre olika profesionales, samma tid (10:00) och samma telefon — ingen
    // krock i motorn (`no_overlap` är per profesional), bara den nya
    // telefon-gränsen ska räknas.
    for (const staffKey of ["diego", "matias", "tomas"] as const) {
      const r = await createCustomerBooking({
        businessId: biz.id,
        serviceId: biz.services.corte!,
        staffId: biz.staff[staffKey]!,
        start: at2("10:00" as LocalTime),
        name: "Cliente Frecuente",
        phone: ph,
        email: `c${phoneSeq}@example.com`,
        idempotencyKey: randomUUID(),
        now: NOW,
      });
      if (!r.ok) throw new Error(r.error);
    }

    const blocked = await createCustomerBooking({
      businessId: biz.id,
      serviceId: biz.services.corte!,
      staffId: biz.staff.diego!,
      start: at2("12:00" as LocalTime),
      name: "Cliente Frecuente",
      phone: ph,
      email: `c${phoneSeq}@example.com`,
      idempotencyKey: randomUUID(),
      now: NOW,
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.error).toBe("rate_limited");

    // Avbokar en av de tre (diegos 10:00) — plats för en ny bokning igen.
    await adminQuery(
      `update public.bookings set status = 'cancelled', cancelled_at = now()
        where business_id = $1
          and staff_id = $2
          and customer_id = (select id from public.customers where business_id = $1 and phone_e164 = $3)
          and lower(period) = $4::timestamptz`,
      [biz.id, biz.staff.diego, ph, at2("10:00" as LocalTime)],
    );
    const afterCancel = await createCustomerBooking({
      businessId: biz.id,
      serviceId: biz.services.corte!,
      staffId: biz.staff.diego!,
      start: at2("12:00" as LocalTime),
      name: "Cliente Frecuente",
      phone: ph,
      email: `c${phoneSeq}@example.com`,
      idempotencyKey: randomUUID(),
      now: NOW,
    });
    expect(afterCancel.ok).toBe(true);
  });
});
