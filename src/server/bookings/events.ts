import "server-only";

import {
  enqueueBookingEvent,
  type BookingEvent as OutboxBookingEvent,
} from "@/server/messaging/outbox";

/**
 * WP-45: motorns händelser efter commit. KONTRAKT mot integrations-engineer
 * (WP-45 steg 3): `BookingEvent` i `src/server/messaging/outbox/types.ts`
 * ska breddas till exakt den här formen. Tills dess översätter
 * `emitBookingEvent` till den nuvarande formen och köar inget för det som
 * utkorgen ännu inte kan (TODO(WP-45 steg 3): ersätt kroppen med
 * `enqueueBookingEvent(e)` när typen är breddad).
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
export type BookingLifecycleEvent =
  | {
      type: "created";
      bookingId: string;
      businessId: string;
      token: string;
      by: "customer" | "owner";
      status: "requested" | "confirmed";
    }
  | {
      type: "moved";
      bookingId: string;
      businessId: string;
      token: string;
      by: "customer" | "owner";
      status: "requested" | "confirmed" | "pending_payment";
    }
  | {
      type: "cancelled";
      bookingId: string;
      businessId: string;
      by: "customer" | "owner";
    }
  | {
      type: "confirmed";
      bookingId: string;
      businessId: string;
      token: string;
      by: "owner";
    }
  | {
      type: "declined";
      bookingId: string;
      businessId: string;
      reason: "declined" | "expired";
    };

/** Anropas EFTER commit. Kastar aldrig (se `enqueueBookingEvent`). */
export async function emitBookingEvent(
  e: BookingLifecycleEvent,
): Promise<void> {
  const legacy = toOutboxEvent(e);
  if (legacy) await enqueueBookingEvent(legacy);
}

/**
 * Den nuvarande utkorgen skulle skicka "reserva confirmada" + påminnelse för
 * en förfrågan och "reserva cancelada" för en nekad — därför köas ingenting
 * för förfrågningar och nekanden förrän steg 3 är klart. En bekräftelse är
 * för kunden precis den gamla `created` av ägaren (bekräftelse + påminnelse,
 * inget ägarmeddelande) och översätts dit.
 */
function toOutboxEvent(e: BookingLifecycleEvent): OutboxBookingEvent | null {
  switch (e.type) {
    case "created":
    case "moved":
      if (e.status === "requested") return null;
      return {
        type: e.type,
        bookingId: e.bookingId,
        businessId: e.businessId,
        token: e.token,
        by: e.by,
      };
    case "cancelled":
      return e;
    case "confirmed":
      return {
        type: "created",
        bookingId: e.bookingId,
        businessId: e.businessId,
        token: e.token,
        by: "owner",
      };
    case "declined":
      return null;
  }
}
