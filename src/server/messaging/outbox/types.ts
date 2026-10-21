import "server-only";

/**
 * Delade typer för utkorgen (`message_outbox`, WP-16 steg 1/2). Samma
 * värden som `public.message_channel`/`message_recipient_kind` i databasen,
 * men som egna literaler här så att `enqueue.ts`/`worker.ts` inte behöver
 * importera de genererade databastyperna för något så litet.
 */
/** `whatsapp` (D-063): kundens bokningsmeddelanden när kunden samtyckt och
 * mallen är godkänd hos Meta — se `src/server/messaging/whatsapp/channel.ts`.
 * `sms` finns kvar i databasens enum men används inte (D-062). */
export type OutboxChannel = "email" | "sms" | "whatsapp";
/** `invitee` (WP-46, D-034): `member_invitations` — se
 * `src/server/team/invitations.ts` (köar) och `./worker.ts`s
 * `sendInvitee`/`loadInvitationContext` (skickar, slår upp adressen via
 * `payload.invitationId`, aldrig en adress i kön själv). */
export type OutboxRecipientKind = "customer" | "owner" | "invitee";

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
 *   `/{slug}`. `message` (bara vid `reason: "declined"`, ägarens valfria
 *   fritextmotiv, ≤ 300 tecken) skickas som `motivo` till kunden i
 *   `solicitudRechazada` (e-post, inte SMS) — sparas aldrig i `bookings`,
 *   bara i outboxens rad, som rensas efter sändning (D-029).
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
      /** Bara vid `reason: "declined"` (ägaren skrev ett motiv). Trimmat,
       * ≤ 300 tecken (samma gräns som `ownerDecisionRequestSchema.reason`,
       * `src/server/scheduling/schemas.ts`). */
      message?: string;
    }
  /** WP-56: kunden begärde avbokning (`cancel_requested`), företaget ska
   * godkänna eller neka (`/app/solicitudes/{bookingId}`). */
  | { type: "cancel_requested"; bookingId: string; businessId: string }
  /** WP-56: företaget nekade avbokningen, bokningen gäller igen. */
  | { type: "cancel_declined"; bookingId: string; businessId: string };

/**
 * KONTRAKT mot `src/server/waitlist/` (scheduling-engineer, WP-23): håll
 * exakt. `enqueueWaitlistEvent` anropas EFTER väntelistetransaktionen
 * committats (samma regel som `enqueueBookingEvent` ovan), en gång per
 * händelse.
 *
 * - `waitlist_offer`: en tid blev ledig och erbjuds `entryId` (sequential:
 *   en i taget; broadcast: alla samtidigt, en rad per entry). `token` är
 *   klartext-token för `/v/[token]` (D-029 — bara hashen ligger i
 *   `waitlist_entries.offer_token_hash`).
 * - `waitlist_taken`: tiden som erbjöds `entryId` hann tas av någon annan
 *   (en annan entry i samma broadcast, eller — i sequential-läget — relevant
 *   bara om något annat tog tiden utanför kön) innan den här kunden hann
 *   svara. Ingen token: ren avisering, kunden står kvar i kön.
 */
export type WaitlistEvent =
  | {
      type: "waitlist_offer";
      businessId: string;
      entryId: string;
      token: string;
    }
  | { type: "waitlist_taken"; businessId: string; entryId: string };
