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
  customerFormSchemaFor,
  waitlistFormSchema,
} from "@/components/booking/form-schema";
import type { BookingActionResult } from "@/components/booking/types";
import { market } from "@/config/brand";
import { resolveBusinessBySlug } from "@/server/bookings/business";
import {
  createCustomerBooking,
  saveBookingConsent,
} from "@/server/bookings/submit";
import { pgErrorCode } from "@/server/db/errors";
import { kickOutbox } from "@/server/messaging/outbox";
import { systemClock } from "@/server/scheduling/clock";

export async function createBooking(
  slug: string,
  input: unknown,
): Promise<BookingActionResult> {
  const parsed = customerFormSchemaFor(market).safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  // slotId är instanten direkt (page-data.ts sätter BookingSlot.id = start):
  // saknas den kan motorn inte räkna ut en starttid.
  if (!parsed.data.slotId) return { ok: false, code: "invalid_input" };

  const business = await resolveBusinessBySlug(slug);
  if (!business) return { ok: false, code: "not_found" };

  const now = systemClock();
  const result = await createCustomerBooking({
    businessId: business.id,
    serviceId: parsed.data.serviceId,
    staffId: parsed.data.staffId,
    start: parsed.data.slotId,
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email || undefined,
    idempotencyKey: parsed.data.idempotencyKey,
    now,
  });
  if (!result.ok) return { ok: false, code: result.error };
  // WP-16: bekräftelsen skickas direkt efter svaret, utan att vänta på cron.
  void kickOutbox();

  // Granskningsfynd: bokningen är redan committad här — svara alltid att den
  // lyckades, även om samtycket (en separat transaktion, submit.ts) inte
  // sparas. Ett omförsök (samma idempotencyKey) når `createCustomerBooking`s
  // idempotens-gren och kör den här skrivningen igen. `pgErrorCode` läser
  // bara SQLSTATE (aldrig namn/telefon/e-post) — se src/server/db/errors.ts.
  try {
    await saveBookingConsent({
      businessId: business.id,
      customerId: result.value.customerId,
      marketing: parsed.data.marketing,
      consentVersion: parsed.data.consentVersion,
      now,
    });
  } catch (e) {
    // Utanför src/server (console.* är bara förbjudet där) — ingen persondata.
    console.error(
      "createBooking: kunde inte spara samtycket (bokningen lyckades ändå)",
      {
        businessId: business.id,
        bookingId: result.value.id,
        sqlstate: pgErrorCode(e),
      },
    );
  }

  return { ok: true };
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
