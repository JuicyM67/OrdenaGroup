import "server-only";

/**
 * Delade typer för utkorgen (`message_outbox`, WP-16 steg 1/2). Samma
 * värden som `public.message_channel`/`message_recipient_kind` i databasen,
 * men som egna literaler här så att `enqueue.ts`/`worker.ts` inte behöver
 * importera de genererade databastyperna för något så litet.
 */
export type OutboxChannel = "email" | "sms";
export type OutboxRecipientKind = "customer" | "owner";

/**
 * KONTRAKT mot `src/server/bookings/` (scheduling-engineer): håll exakt.
 * `enqueueBookingEvent` anropas EFTER att bokningstransaktionen committats
 * (aldrig i anroparens transaktion), en gång per händelse. Samma form som
 * `BookingLifecycleEvent` i `src/server/bookings/events.ts` (WP-45): den
 * filen importerar typen härifrån i stället för att hålla en egen kopia.
 *
 * - `created`/`moved` bär statusen: `requested` = förfrågan (kund
 *   `solicitudRecibida`, ägaren `nuevaSolicitud`, ingen påminnelse).
 * - `confirmed`: ägaren bekräftade en förfrågan (`requested → confirmed`).
 *   `token` är en NY klartext-token (bekräftelsen roterar den, D-029) —
 *   länken i "solicitud recibida" slutar gälla.
 * - `declined`: förfrågan nekades (`reason: "declined"`, av ägaren) eller
 *   gick ut (`reason: "expired"`, av svepet). Ingen token: länken går till
 *   `/{slug}`.
 */
export type BookingEvent =
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
