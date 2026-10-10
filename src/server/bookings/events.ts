import "server-only";

import {
  enqueueBookingEvent,
  type BookingEvent,
} from "@/server/messaging/outbox";
import { reconcileSoon } from "@/server/payments/stripe/reconcile";
import { systemClock } from "@/server/scheduling/clock";

/**
 * WP-45: motorns händelser efter commit. Typen är exakt `BookingEvent` från
 * `src/server/messaging/outbox/types.ts` (samma kontrakt, ingen egen kopia
 * sedan steg 3 breddade den) — `BookingLifecycleEvent` är bara ett lokalt
 * alias så koden i `src/server/bookings/` slipper importera från
 * `messaging/`.
 *
 * - `created`/`moved` bär statusen: `requested` = förfrågan (kund
 *   "solicitudRecibida", ägaren "nuevaSolicitud", ingen påminnelse).
 * - `confirmed`: ägaren bekräftade en förfrågan. `token` är en NY klartext-
 *   token (bekräftelsen roterar den, som flytten i D-029) — länken i
 *   "solicitud recibida" slutar gälla, bekräftelsen och påminnelsen bär den nya.
 * - `declined`: förfrågan nekades (`reason: "declined"`, av ägaren) eller
 *   gick ut (`reason: "expired"`, av svepet). Ingen token: länken går till
 *   `/{slug}`.
 */
export type BookingLifecycleEvent = BookingEvent;

/** Anropas EFTER commit. Kastar aldrig (se `enqueueBookingEvent`). */
export async function emitBookingEvent(
  e: BookingLifecycleEvent,
): Promise<void> {
  await enqueueBookingEvent(e);
  // WP-64 (D-044): en betalning online följer bokningens utfall — bekräftad →
  // dra kortet, nekad/utgången/avbokad → släpp reservationen eller återbetala.
  // Best effort; cron-passet (`runStripeSweep`) fångar det som missas.
  if (
    e.type === "confirmed" ||
    e.type === "declined" ||
    e.type === "cancelled"
  ) {
    reconcileSoon(e.businessId, e.bookingId, systemClock());
  }
}
