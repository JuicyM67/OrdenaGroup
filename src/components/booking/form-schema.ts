/**
 * Zod-schema för datasteget — bara servern (qa-granskning, item 6): klienten
 * validerar med rena funktioner (`client-validation.ts`), aldrig med Zod, så
 * att Zod (och dess språkfiler) inte buntas in i klientkomponenten. Det här
 * schemat körs i `src/app/[slug]/actions.ts` (server-action-closures) som den
 * enda källan till sanning för indata. Ingen spansk text här: `errors.ts`
 * mappar `issue.message`-koderna till strängar.
 *
 * Gränserna (namn max 120, e-post max 254) matchar WP-10:s
 * `customerInputSchema` (`src/server/scheduling/schemas.ts`).
 */
import "server-only";

import { z } from "zod";

import { reserva } from "@/i18n";
import { chileanMobileInputSchema } from "@/lib/format/schemas";

export const customerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "name.empty" })
    .max(120, { error: "name.too_long" }),
  phone: chileanMobileInputSchema,
  email: z.union([
    z.literal(""),
    z.email({ error: "email.invalid" }).max(254, { error: "email.invalid" }),
  ]),
  termsAccepted: z.literal(true, { error: "terms.required" }),
  marketing: z.boolean(),
  consentVersion: z.literal(reserva.consentimientos.version),
  idempotencyKey: z.uuid(),
  serviceId: z.string().min(1),
  staffId: z.string().min(1),
  date: z.string().min(1),
  slotId: z.string().min(1).nullable(),
});

export type CustomerFormInput = z.input<typeof customerFormSchema>;
export type CustomerFormOutput = z.output<typeof customerFormSchema>;

/** Väntelistan: samma formulär men utan hora (ingen `slotId`, den full dagen
 * räcker), och en egen samtyckestext (FRÅGA 5c: `terminosListaEspera`). */
export const waitlistFormSchema = customerFormSchema
  .omit({ slotId: true })
  .extend({
    date: z.string().min(1),
  });

export type WaitlistFormInput = z.input<typeof waitlistFormSchema>;
export type WaitlistFormOutput = z.output<typeof waitlistFormSchema>;
