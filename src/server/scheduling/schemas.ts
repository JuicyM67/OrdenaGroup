import "server-only";

import { z } from "zod";

import { addLocalDays, type LocalDate } from "@/lib/format/dates";
import {
  e164Schema,
  instantSchema,
  localDateSchema,
} from "@/lib/format/schemas";

/**
 * Indatascheman för motorn. WP-20/21 validerar formulärdata med dem i sina
 * Server Actions; motorn validerar ändå själv (`invalid_input`). Strikta
 * objekt: okända fält (t.ex. ett pris från klienten) avvisas.
 */

const MAX_RANGE_DAYS = 62;

const uuid = z.uuid();
export const staffChoiceSchema = z.union([z.literal("any"), z.uuid()]);
const nowSchema = z.date();

export const actorSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("customer") }),
  z.strictObject({ kind: z.literal("owner"), userId: z.uuid() }),
]);

const audienceSchema = z.enum(["customer", "owner"]);

/** Kund får aldrig ägarvyn; ägaren får be om kundvyn (förhandsvisning). */
function withAudience<
  T extends {
    actor: z.infer<typeof actorSchema>;
    audience?: "customer" | "owner" | undefined;
  },
>(v: T, ctx: z.RefinementCtx): T & { audience: "customer" | "owner" } {
  const audience = v.audience ?? v.actor.kind;
  if (audience === "owner" && v.actor.kind !== "owner") {
    ctx.addIssue({ code: "custom", message: "audience.forbidden" });
    return z.NEVER;
  }
  return { ...v, audience };
}

export const availableDaysInputSchema = z
  .strictObject({
    businessId: uuid,
    serviceId: uuid,
    staffId: staffChoiceSchema,
    from: localDateSchema,
    to: localDateSchema,
    actor: actorSchema,
    audience: audienceSchema.optional(),
    now: nowSchema,
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
  })
  .transform(withAudience);

export const availableSlotsInputSchema = z
  .strictObject({
    businessId: uuid,
    serviceId: uuid,
    staffId: staffChoiceSchema,
    date: localDateSchema,
    actor: actorSchema,
    audience: audienceSchema.optional(),
    now: nowSchema,
    limit: z.int().min(1).max(500).optional(),
  })
  .transform(withAudience);

export const customerInputSchema = z.strictObject({
  phone: e164Schema,
  name: z.string().trim().min(1).max(120),
  email: z.email().max(254).optional(),
});

export const createBookingInputSchema = z.strictObject({
  businessId: uuid,
  serviceId: uuid,
  staffId: staffChoiceSchema,
  start: instantSchema,
  customer: customerInputSchema,
  source: z.enum(["web", "manual", "waitlist"]),
  notes: z.string().trim().max(500).optional(),
  actor: actorSchema,
  now: nowSchema,
});

export const moveBookingInputSchema = z.strictObject({
  businessId: uuid,
  bookingId: uuid,
  newStart: instantSchema,
  newStaffId: staffChoiceSchema.optional(),
  actor: actorSchema,
  now: nowSchema,
});

export const cancelBookingInputSchema = z
  .strictObject({
    businessId: uuid,
    bookingId: uuid,
    by: z.enum(["owner", "customer"]),
    reason: z.string().trim().max(500).optional(),
    actor: actorSchema,
    now: nowSchema,
  })
  .check((ctx) => {
    if (ctx.value.by !== ctx.value.actor.kind) {
      ctx.issues.push({
        code: "custom",
        message: "by.mismatch",
        input: ctx.value,
      });
    }
  });

export type AvailableDaysInput = z.input<typeof availableDaysInputSchema>;
export type AvailableSlotsInput = z.input<typeof availableSlotsInputSchema>;
export type CreateBookingInput = z.input<typeof createBookingInputSchema>;
export type MoveBookingInput = z.input<typeof moveBookingInputSchema>;
export type CancelBookingInput = z.input<typeof cancelBookingInputSchema>;
