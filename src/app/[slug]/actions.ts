/**
 * Server-action-stubbar (WP-13 R5): validerar indata på nytt med samma Zod-schema
 * som klienten och svarar ur fixturerna. `createBooking`/riktig tillgänglighet,
 * sparade samtycken, outbox och WhatsApp-bekräftelse är WP-20 — den här filen
 * ersätts helt då. Loggar aldrig indata (varken `console` eller namn/telefon).
 */
"use server";

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
  const byStaff = business.availability[serviceId];
  const days = byStaff?.[staffId] ?? byStaff?.any;
  return days?.find((d) => d.date === date) ?? null;
}

export async function createBookingAction(
  slug: string,
  input: unknown,
): Promise<BookingActionResult> {
  const parsed = customerFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };

  const business = fixtureBusinesses[slug];
  if (!business) return { ok: false, code: "not_found" };

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

export async function joinWaitlistAction(
  slug: string,
  input: unknown,
): Promise<BookingActionResult> {
  const parsed = waitlistFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };

  const business = fixtureBusinesses[slug];
  if (!business) return { ok: false, code: "not_found" };

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
