/**
 * Riktiga bokningar (WP-20): validerar indata på nytt med Zod-schemat,
 * slår upp `businessId` på sluggen och anropar motorn. Ersätter WP-13:s
 * fixture-stubbar helt.
 *
 * Säkerhet (qa-granskning WP-13, item 5 — gäller fortfarande): **inte**
 * `"use server"` här. Dessa är vanliga funktioner som tar `slug` som en
 * vanlig parameter — om filen vore en server-action-modul skulle `slug`
 * vara en del av det klientanropsbara kontraktet, och vem som helst skulle
 * kunna anropa `createBooking(vilketFöretagSomHelst, …)` direkt. De enda
 * riktiga server actionsen är de inbäddade closurerna i `page.tsx` (och
 * design lab:s `page.tsx`), som binder `slug` på servern.
 * `import "server-only"` stoppar ett klientimport-misstag.
 */
import "server-only";

import {
  customerFormSchema,
  waitlistFormSchema,
} from "@/components/booking/form-schema";
import type { BookingActionResult } from "@/components/booking/types";
import { submitCustomerBooking } from "@/server/bookings/submit";
import { systemClock } from "@/server/scheduling/clock";

import { resolveBusinessBySlug } from "./business";

export async function createBooking(
  slug: string,
  input: unknown,
): Promise<BookingActionResult> {
  const parsed = customerFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  // slotId är instanten direkt (page-data.ts sätter BookingSlot.id = start):
  // saknas den kan motorn inte räkna ut en starttid.
  if (!parsed.data.slotId) return { ok: false, code: "invalid_input" };

  const business = await resolveBusinessBySlug(slug);
  if (!business) return { ok: false, code: "not_found" };

  const result = await submitCustomerBooking({
    businessId: business.id,
    serviceId: parsed.data.serviceId,
    staffId: parsed.data.staffId,
    start: parsed.data.slotId,
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email || undefined,
    marketing: parsed.data.marketing,
    consentVersion: parsed.data.consentVersion,
    now: systemClock(),
  });

  return result.ok ? { ok: true } : { ok: false, code: result.error };
}

/**
 * Väntelistan är utanför WP-20 (F8/WP-23, se docs/tasks/plans/WP-20.md):
 * `loadReservaPageData` utelämnar redan hela dagen när den är full (precis
 * som en stängd dag), så `BookingScreen` kan i praktiken aldrig anropa den
 * här funktionen från `/{slug}` — `WaitlistCard`/"Avísame" syns aldrig för
 * riktig data. Kvar bara för att matcha `BookingScreen`s kontrakt
 * (`joinWaitlist` är en obligatorisk prop); väntelistan finns kvar i
 * design lab (fixturerna har fulla dagar).
 */
export async function joinWaitlist(
  slug: string,
  input: unknown,
): Promise<BookingActionResult> {
  void slug;
  const parsed = waitlistFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  return { ok: false, code: "invalid_input" };
}
