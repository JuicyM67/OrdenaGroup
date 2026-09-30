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

import {
  createManualBooking,
  loadOwnerBookableCatalog,
  moveOwnerBooking,
  saveManualConsent,
} from "./manual-booking";

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();
const TUE = "2026-10-06" as LocalDate;
const NOW = new Date(at("2026-10-01", "09:00"));

let biz: TestBusiness;
let other: TestBusiness;
let phoneSeq = 0;
const phone = () => `+5696${String(1_000_000 + ++phoneSeq).slice(-7)}`;

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness();
  other = await createTestBusiness();
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await dropTestBusiness(other);
  await closePool();
});

async function customerRow(customerId: string) {
  const r = await adminQuery<{
    consent_terms_at: string | null;
    consent_marketing_at: string | null;
    consent_version: string | null;
    consent_channel: string | null;
  }>(
    `select consent_terms_at, consent_marketing_at, consent_version, consent_channel
       from public.customers where business_id = $1 and id = $2`,
    [biz.id, customerId],
  );
  return r.rows[0]!;
}

async function bookingRow(bookingId: string) {
  const r = await adminQuery<{
    source: string;
    staff_id: string;
    s: number;
  }>(
    `select source::text as source, staff_id,
            extract(epoch from lower(period))::float8 * 1000 as s
       from public.bookings where business_id = $1 and id = $2`,
    [biz.id, bookingId],
  );
  return r.rows[0]!;
}

describe("loadOwnerBookableCatalog", () => {
  it("de tjänster som finns i det egna företaget, med profesionales som utför dem", async () => {
    const catalog = await loadOwnerBookableCatalog(biz.ownerUserId, biz.id);
    expect(catalog.map((c) => c.name).sort()).toEqual([
      "Barba",
      "Corte + barba",
      "Corte clásico",
    ]);
    const corte = catalog.find((c) => c.name === "Corte clásico")!;
    expect(corte.staffIds.sort()).toEqual(
      [biz.staff.diego!, biz.staff.matias!, biz.staff.tomas!].sort(),
    );
  });

  it("tenant-isolering: ett annat företags ägare ser inget av det här", async () => {
    const catalog = await loadOwnerBookableCatalog(other.ownerUserId, biz.id);
    expect(catalog).toEqual([]);
  });
});

describe("createManualBooking", () => {
  it("skapar en bokning utanför rutnätet (16:07), source = manual", async () => {
    const r = await createManualBooking(biz.ownerUserId, biz.id, NOW, {
      serviceId: biz.services.corte,
      staffId: biz.staff.diego,
      date: TUE,
      time: "16:07",
      name: "Ana Pérez",
      phone: phone(),
      email: "",
      consent: false,
    });
    if (!r.ok) throw new Error(r.error);
    const row = await bookingRow(r.value.bookingId);
    expect(row.source).toBe("manual");
    expect(row.staff_id).toBe(biz.staff.diego);
    expect(row.s).toBe(at(TUE, "16:07"));
  });

  it("utan samtyckesrutan: consent = false i svaret, inga consent_*-fält skrivs", async () => {
    const r = await createManualBooking(biz.ownerUserId, biz.id, NOW, {
      serviceId: biz.services.corte,
      staffId: biz.staff.diego,
      date: TUE,
      time: "10:00",
      name: "Bruno Silva",
      phone: phone(),
      email: "",
      consent: false,
    });
    if (!r.ok) throw new Error(r.error);
    expect(r.value.consent).toBe(false);
    expect(await customerRow(r.value.customerId)).toEqual({
      consent_terms_at: null,
      consent_marketing_at: null,
      consent_version: null,
      consent_channel: null,
    });
  });

  it("med samtyckesrutan: skapar bara flaggan — saveManualConsent skriver consent_channel = manual, aldrig consent_marketing_at", async () => {
    const r = await createManualBooking(biz.ownerUserId, biz.id, NOW, {
      serviceId: biz.services.corte,
      staffId: biz.staff.diego,
      date: TUE,
      time: "11:00",
      name: "Carla Muñoz",
      phone: phone(),
      email: "carla@example.com",
      consent: true,
    });
    if (!r.ok) throw new Error(r.error);
    expect(r.value.consent).toBe(true);
    // Bokningen är klar innan samtycket sparas (samma två-stegsmönster som
    // src/app/[slug]/actions.ts/submit.ts) — anroparen (page.tsx) gör det
    // andra steget, som här simuleras direkt.
    expect(await customerRow(r.value.customerId)).toEqual({
      consent_terms_at: null,
      consent_marketing_at: null,
      consent_version: null,
      consent_channel: null,
    });

    await saveManualConsent(biz.ownerUserId, biz.id, r.value.customerId, NOW);

    const c = await customerRow(r.value.customerId);
    expect(c.consent_channel).toBe("manual");
    expect(c.consent_terms_at).not.toBeNull();
    // Säkerhetsgranskning WP-26 (punkt 10): customers.consent_version är
    // alltid LEGAL_VERSION (serverns), aldrig clientes.consentimientoManual.version.
    expect(c.consent_version).toBe(LEGAL_VERSION);
    expect(c.consent_marketing_at).toBeNull();

    // WP-26: samma transaktion loggar en terms-händelse, kanal manual.
    const events = await adminQuery<{ kind: string; channel: string }>(
      `select kind::text, channel::text from public.consent_events
        where business_id = $1 and customer_id = $2`,
      [biz.id, r.value.customerId],
    );
    expect(events.rows).toEqual([{ kind: "terms", channel: "manual" }]);
  });

  it("Cualquiera fungerar (staffId = any)", async () => {
    const r = await createManualBooking(biz.ownerUserId, biz.id, NOW, {
      serviceId: biz.services.corte,
      staffId: "any",
      date: TUE,
      time: "12:00",
      name: "Diego Rojas",
      phone: phone(),
      email: "",
      consent: false,
    });
    expect(r.ok).toBe(true);
  });

  it("krock: samma profesional, samma tid ger slot_taken", async () => {
    const p = phone();
    const first = await createManualBooking(biz.ownerUserId, biz.id, NOW, {
      serviceId: biz.services.corte,
      staffId: biz.staff.matias,
      date: TUE,
      time: "13:00",
      name: "Uno",
      phone: phone(),
      email: "",
      consent: false,
    });
    expect(first.ok).toBe(true);
    const second = await createManualBooking(biz.ownerUserId, biz.id, NOW, {
      serviceId: biz.services.corte,
      staffId: biz.staff.matias,
      date: TUE,
      time: "13:00",
      name: "Dos",
      phone: p,
      email: "",
      consent: false,
    });
    expect(second).toEqual({ ok: false, error: "slot_taken" });
  });

  it("ogiltig indata (fel form) ger invalid_input", async () => {
    const r = await createManualBooking(biz.ownerUserId, biz.id, NOW, {
      serviceId: "not-a-uuid",
      staffId: biz.staff.diego,
      date: TUE,
      time: "14:00",
      name: "X",
      phone: phone(),
      email: "",
      consent: false,
    });
    expect(r).toEqual({ ok: false, error: "invalid_input" });
  });

  it("tenant-isolering: ett annat företags ägare kan inte boka mot det här företaget", async () => {
    const r = await createManualBooking(other.ownerUserId, biz.id, NOW, {
      serviceId: biz.services.corte,
      staffId: biz.staff.diego,
      date: TUE,
      time: "15:00",
      name: "Intruso",
      phone: phone(),
      email: "",
      consent: false,
    });
    expect(r).toEqual({ ok: false, error: "service_not_offered" });
  });
});

describe("saveManualConsent", () => {
  it("tenant-isolering: ett annat företags ägare kan inte skriva samtycke på den här kunden", async () => {
    const r = await createManualBooking(biz.ownerUserId, biz.id, NOW, {
      serviceId: biz.services.corte,
      staffId: biz.staff.tomas,
      date: TUE,
      time: "14:30",
      name: "Gonzalo Pino",
      phone: phone(),
      email: "",
      consent: false,
    });
    if (!r.ok) throw new Error(r.error);

    // RLS gör att updaten inte matchar någon rad — inget fel kastas, men inget
    // skrivs heller (samma "0 rader"-mönster som RLS-testerna i pgTAP).
    await saveManualConsent(other.ownerUserId, biz.id, r.value.customerId, NOW);
    expect(await customerRow(r.value.customerId)).toEqual({
      consent_terms_at: null,
      consent_marketing_at: null,
      consent_version: null,
      consent_channel: null,
    });
  });
});

describe("moveOwnerBooking", () => {
  it("flyttar till en ny dag/tid, samma profesional", async () => {
    const created = await createManualBooking(biz.ownerUserId, biz.id, NOW, {
      serviceId: biz.services.corte,
      staffId: biz.staff.tomas,
      date: TUE,
      time: "17:00",
      name: "Elena Vidal",
      phone: phone(),
      email: "",
      consent: false,
    });
    if (!created.ok) throw new Error(created.error);

    const moved = await moveOwnerBooking(biz.ownerUserId, biz.id, NOW, {
      bookingId: created.value.bookingId,
      date: "2026-10-07" as LocalDate,
      time: "11:31",
    });
    expect(moved).toEqual({
      ok: true,
      value: { bookingId: created.value.bookingId },
    });

    const row = await bookingRow(created.value.bookingId);
    expect(row.s).toBe(at("2026-10-07", "11:31"));
    expect(row.staff_id).toBe(biz.staff.tomas);
  });

  it("okänt boknings-id ger not_found", async () => {
    const r = await moveOwnerBooking(biz.ownerUserId, biz.id, NOW, {
      bookingId: "00000000-0000-0000-0000-000000000000",
      date: TUE,
      time: "09:00",
    });
    expect(r).toEqual({ ok: false, error: "not_found" });
  });

  it("tenant-isolering: ett annat företags ägare kan inte flytta den här bokningen", async () => {
    const created = await createManualBooking(biz.ownerUserId, biz.id, NOW, {
      serviceId: biz.services.corte,
      staffId: biz.staff.diego,
      date: TUE,
      time: "18:00",
      name: "Fabiola Toro",
      phone: phone(),
      email: "",
      consent: false,
    });
    if (!created.ok) throw new Error(created.error);

    const r = await moveOwnerBooking(other.ownerUserId, biz.id, NOW, {
      bookingId: created.value.bookingId,
      date: TUE,
      time: "18:30",
    });
    expect(r).toEqual({ ok: false, error: "not_found" });
  });
});
