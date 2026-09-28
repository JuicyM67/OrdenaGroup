/**
 * Server-stubbar bara för design lab (WP-20: flyttades hit från
 * `src/app/[slug]/actions.ts`, som nu anropar den riktiga motorn — se
 * docs/tasks/plans/WP-20.md). Validerar indata på nytt med Zod-schemat och
 * svarar ur fixturerna, precis som WP-13:s ursprungliga stubbe. Loggar
 * aldrig indata (varken `console` eller namn/telefon).
 *
 * Säkerhet (qa-granskning WP-13, item 5 — gäller fortfarande): **inte**
 * `"use server"` här, av samma skäl som `src/app/[slug]/actions.ts`.
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

import { fixtureBusinesses, SLOT_TAKEN_ID } from "./fixtures";

function findDayFor(
  business: BookingPageData,
  serviceId: string,
  staffId: string,
  date: string,
) {
  // Ingen fallback till "any" (qa-granskning WP-13, item 13): samma regel
  // som `summary.ts`s `findDay` och `booking-screen.tsx`s `daysForSelection`.
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
