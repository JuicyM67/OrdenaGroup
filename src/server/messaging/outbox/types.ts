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
 * KONTRAKT mot `src/server/bookings/` (scheduling-engineer, WP-16 steg 3):
 * håll exakt. `enqueueBookingEvent` anropas EFTER att bokningstransaktionen
 * committats (aldrig i anroparens transaktion), en gång per händelse.
 */
export type BookingEvent =
  | {
      type: "created";
      bookingId: string;
      businessId: string;
      token: string;
      by: "customer" | "owner";
    }
  | {
      type: "moved";
      bookingId: string;
      businessId: string;
      token: string;
      by: "customer" | "owner";
    }
  | {
      type: "cancelled";
      bookingId: string;
      businessId: string;
      by: "customer" | "owner";
    };
