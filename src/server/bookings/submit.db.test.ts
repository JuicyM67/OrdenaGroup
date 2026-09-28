import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  fromLocal,
  SANTIAGO,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";
import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  dropTestBusiness,
  type TestBusiness,
} from "@/server/db/testing";

import { submitCustomerBooking } from "./submit";

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

describe("submitCustomerBooking", () => {
  it("skapar bokningen och sparar samtycket på kundraden (marketing accepterat)", async () => {
    const result = await submitCustomerBooking({
      businessId: biz.id,
      serviceId: biz.services.corte!,
      staffId: biz.staff.diego!,
      start: iso(at(TUE, "11:00")),
      name: "Camila Rojas",
      phone: phone(),
      marketing: true,
      consentVersion: "2026-10-v1",
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

    const consent = await consentRow(result.value.customerId);
    expect(consent.consent_terms_at).not.toBeNull();
    expect(consent.consent_marketing_at).not.toBeNull();
    expect(consent.consent_version).toBe("2026-10-v1");
    expect(consent.consent_channel).toBe("web");
  });

  it("marketing avmarkerat: consent_marketing_at förblir null", async () => {
    const result = await submitCustomerBooking({
      businessId: biz.id,
      serviceId: biz.services.corte!,
      staffId: biz.staff.matias!,
      start: iso(at(TUE, "12:00")),
      name: "Ana Pérez",
      phone: phone(),
      marketing: false,
      consentVersion: "2026-10-v1",
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const consent = await consentRow(result.value.customerId);
    expect(consent.consent_terms_at).not.toBeNull();
    expect(consent.consent_marketing_at).toBeNull();
    expect(consent.consent_version).toBe("2026-10-v1");
    expect(consent.consent_channel).toBe("web");
  });

  it("fel start (utanför öppettid): inget skrivs, inget samtycke sparas", async () => {
    const before = await adminQuery<{ n: string }>(
      "select count(*)::text as n from public.customers where business_id = $1",
      [biz.id],
    );
    const result = await submitCustomerBooking({
      businessId: biz.id,
      serviceId: biz.services.corte!,
      staffId: biz.staff.diego!,
      start: iso(at(TUE, "23:00")),
      name: "Pedro Vidal",
      phone: phone(),
      marketing: false,
      consentVersion: "2026-10-v1",
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
});
