/**
 * Zod-schema för datasteget (steg 5). Samma schema i klienten och i
 * server-action-stubben (`src/app/[slug]/actions.ts`). Ingen spansk text här: UI
 * mappar `issue.message`-koderna till strängar via `errors.ts`.
 */
import { z } from "zod";

import { reserva } from "@/i18n";
import { chileanMobileInputSchema } from "@/lib/format/schemas";

export const customerFormSchema = z.object({
  name: z.string().trim().min(1, { error: "name.empty" }),
  phone: chileanMobileInputSchema,
  email: z.union([z.literal(""), z.email({ error: "email.invalid" })]),
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
