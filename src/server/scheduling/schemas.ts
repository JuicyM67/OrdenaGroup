import "server-only";

import { z } from "zod";

import { addLocalDays, type LocalDate } from "@/lib/format/dates";
import {
  e164Schema,
  instantSchema,
  localDateSchema,
} from "@/lib/format/schemas";

/**
 * Indatakontraktet för motorn har två delar (säkerhetsgranskning WP-10):
 *
 * 1. **Request** = bara det som kunden eller ägaren valt i ett formulär
 *    (tjänst, profesional, tid, kunduppgifter, token). Strikta objekt: okända
 *    fält (pris, actor, now, source, audience, limit …) avvisas.
 * 2. **Context** (`EngineContext`) = det som bara servern får sätta:
 *    `businessId` (från sluggen i den publika vägen eller från ägarens
 *    verifierade medlemskap), `actor` (från den verifierade sessionen, annars
 *    `customer`) och `now` (`systemClock()`). Kontexten byggs aldrig av
 *    formulärdata. Regeln står i SCHEDULING.md.
 */

const MAX_RANGE_DAYS = 62;

const uuid = z.uuid();
export const staffChoiceSchema = z.union([z.literal("any"), z.uuid()]);

/** 32 byte base64url (43 tecken), se bookings/token.ts. */
export const manageTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

// ---------------------------------------------------------------------------
// Betrodd kontext (bara servern)
// ---------------------------------------------------------------------------

export const actorSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("customer") }),
  z.strictObject({ kind: z.literal("owner"), userId: z.uuid() }),
]);

export const engineContextSchema = z.strictObject({
  businessId: uuid,
  actor: actorSchema,
  now: z.date(),
});

/** createBooking: servern kan markera en bokning från väntelistan (WP-23). */
export const createContextSchema = engineContextSchema.extend({
  source: z.literal("waitlist").optional(),
});

export type EngineContext = z.infer<typeof engineContextSchema>;
export type CreateContext = z.infer<typeof createContextSchema>;

/**
 * Kontexten kommer från servern; ett fel här är ett programmeringsfel och
 * kastas (TypeError), till skillnad från `invalid_input` för request.
 */
export function parseContext<S extends z.ZodType>(
  schema: S,
  ctx: unknown,
): z.infer<S> {
  const r = schema.safeParse(ctx);
  if (!r.success) throw new TypeError("scheduling: ogiltig serverkontext");
  return r.data;
}

// ---------------------------------------------------------------------------
// Request (formulärdata)
// ---------------------------------------------------------------------------

export const availableDaysRequestSchema = z
  .strictObject({
    serviceId: uuid,
    staffId: staffChoiceSchema,
    from: localDateSchema,
    to: localDateSchema,
  })
  .check((ctx) => {
    const { from, to } = ctx.value as { from: LocalDate; to: LocalDate };
    if (from > to) {
      ctx.issues.push({
        code: "custom",
        message: "range.inverted",
        input: ctx.value,
      });
    } else if (addLocalDays(from, MAX_RANGE_DAYS - 1) < to) {
      ctx.issues.push({
        code: "custom",
        message: "range.too_long",
        input: ctx.value,
      });
    }
  });

export const availableSlotsRequestSchema = z.strictObject({
  serviceId: uuid,
  staffId: staffChoiceSchema,
  date: localDateSchema,
});

export const customerInputSchema = z.strictObject({
  phone: e164Schema,
  name: z.string().trim().min(1).max(120),
  email: z.email().max(254).optional(),
});

export const createBookingRequestSchema = z.strictObject({
  serviceId: uuid,
  staffId: staffChoiceSchema,
  start: instantSchema,
  customer: customerInputSchema,
  notes: z.string().trim().max(500).optional(),
});

/** Kundens flytt: bokningen identifieras bara med länkens token. */
export const customerMoveRequestSchema = z.strictObject({
  manageToken: manageTokenSchema,
  newStart: instantSchema,
  newStaffId: staffChoiceSchema.optional(),
});

/** Ägarens flytt: bokningen identifieras med id (RLS gäller). */
export const ownerMoveRequestSchema = z.strictObject({
  bookingId: uuid,
  newStart: instantSchema,
  newStaffId: staffChoiceSchema.optional(),
});

export const customerCancelRequestSchema = z.strictObject({
  manageToken: manageTokenSchema,
  reason: z.string().trim().max(500).optional(),
});

export const ownerCancelRequestSchema = z.strictObject({
  bookingId: uuid,
  reason: z.string().trim().max(500).optional(),
});

export type AvailableDaysRequest = z.input<typeof availableDaysRequestSchema>;
export type AvailableSlotsRequest = z.input<typeof availableSlotsRequestSchema>;
export type CreateBookingRequest = z.input<typeof createBookingRequestSchema>;
export type MoveBookingRequest =
  | z.input<typeof customerMoveRequestSchema>
  | z.input<typeof ownerMoveRequestSchema>;
export type CancelBookingRequest =
  | z.input<typeof customerCancelRequestSchema>
  | z.input<typeof ownerCancelRequestSchema>;
