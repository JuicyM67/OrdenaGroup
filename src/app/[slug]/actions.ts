/**
 * Server-stubbar (WP-13 R5): validerar indata på nytt med Zod-schemat och
 * svarar ur fixturerna. `createBooking`/riktig tillgänglighet, sparade
 * samtycken, outbox och WhatsApp-bekräftelse är WP-20 — den här filen ersätts
 * helt då. Loggar aldrig indata (varken `console` eller namn/telefon).
 *
 * Säkerhet (qa-granskning, item 5): **inte** `"use server"` här. Dessa är
 * vanliga funktioner som tar `slug` som en vanlig parameter — om filen vore
 * en server-action-modul skulle `slug` vara en del av det klientanropsbara
 * kontraktet, och vem som helst skulle kunna anropa
 * `createBooking(vilketFöretagSomHelst, …)` direkt (förbi
 * `isDesignLabEnabled()`-grinden och tenant-isoleringen). De enda riktiga
 * server actionsen är de inbäddade closurerna i `page.tsx` (och design lab:s
 * `page.tsx`), som binder `slug` på servern och kör grinden i själva
 * closuren. `import "server-only"` stoppar ett klientimport-misstag.
 */
import "server-only";

import {
  customerFormSchema,
  waitlistFormSchema,
} from "@/components/booking/form-schema";
import type {
  BookingActionResult,
  BookingPageData,
} from "@/components/booking/types";

import {
  fixtureBusinesses,
  SLOT_TAKEN_ID,
} from "../design-lab/reserva/fixtures";

function findDayFor(
  business: BookingPageData,
  serviceId: string,
  staffId: string,
  date: string,
) {
  // Ingen fallback till "any" (qa-granskning, item 13): samma regel som
  // `summary.ts`s `findDay` och `booking-screen.tsx`s `daysForSelection`.
  const days = business.availability[serviceId]?.[staffId];
  return days?.find((d) => d.date === date) ?? null;
}

export async function createBooking(
  slug: string,
  input: unknown,
): Promise<BookingActionResult> {
  const parsed = customerFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };

  const business = fixtureBusinesses[slug];
  if (!business) return { ok: false, code: "not_found" };
  if (business.business.status !== "active") {
    return { ok: false, code: "business_unavailable" };
  }

  const { serviceId, staffId, date, slotId } = parsed.data;

  const serviceOk = business.services.some((s) => s.id === serviceId);
  if (!serviceOk) return { ok: false, code: "service_not_offered" };
  const staffOk =
    staffId === "any" || business.staff.some((p) => p.id === staffId);
  if (!staffOk) return { ok: false, code: "service_not_offered" };

  const day = findDayFor(business, serviceId, staffId, date);
  if (!day || day.state !== "open") return { ok: false, code: "outside_hours" };

  const slot = slotId ? day.slots.find((s) => s.id === slotId) : undefined;
  if (!slotId || !slot) return { ok: false, code: "outside_hours" };
  if (slot.id === SLOT_TAKEN_ID) return { ok: false, code: "slot_taken" };

  return { ok: true };
}

export async function joinWaitlist(
  slug: string,
  input: unknown,
): Promise<BookingActionResult> {
  const parsed = waitlistFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };

  const business = fixtureBusinesses[slug];
  if (!business) return { ok: false, code: "not_found" };
  if (business.business.status !== "active") {
    return { ok: false, code: "business_unavailable" };
  }

  const { serviceId, staffId, date } = parsed.data;

  const serviceOk = business.services.some((s) => s.id === serviceId);
  if (!serviceOk) return { ok: false, code: "service_not_offered" };
  const staffOk =
    staffId === "any" || business.staff.some((p) => p.id === staffId);
  if (!staffOk) return { ok: false, code: "service_not_offered" };

  const day = findDayFor(business, serviceId, staffId, date);
  if (!day || day.state !== "full") return { ok: false, code: "invalid_input" };

  return { ok: true };
}
