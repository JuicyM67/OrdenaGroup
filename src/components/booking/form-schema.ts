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
import { mobileInputSchema } from "@/lib/format/schemas";

export const customerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "name.empty" })
    .max(120, { error: "name.too_long" }),
  phone: mobileInputSchema,
  email: z.union([
    z.literal(""),
    z.email({ error: "email.invalid" }).max(254, { error: "email.invalid" }),
  ]),
  termsAccepted: z.literal(true, { error: "terms.required" }),
  marketing: z.boolean(),
  /** D-063: casilla opcional y separada de WhatsApp (nunca premarcada).
   * Falta = no (un cliente viejo sin la casilla nunca da su consentimiento). */
  whatsapp: z.boolean().optional().default(false),
  consentVersion: z.literal(reserva.consentimientos.version),
  idempotencyKey: z.uuid(),
  serviceId: z.string().min(1),
  staffId: z.string().min(1),
  date: z.string().min(1),
  slotId: z.string().min(1).nullable(),
  /** WP-40 (D-031): svar på tjänstens bokningsfrågor, `{ [questionId]:
   * värde }` — redan validerade av klienten (`validateAnswers`,
   * `customer-form.tsx`), men servern (`createCustomerBooking` →
   * `createIn`) validerar alltid på nytt mot sin egen frågelista och litar
   * aldrig på klienten. Formen (`unknown`) är avsiktligt lös här: det
   * riktiga schemat byggs av `buildAnswersSchema` per tjänst. */
  answers: z.record(z.string(), z.unknown()).optional().default({}),
});

/**
 * D-030: e-post är obligatorisk i Reserva (enda kanalen tills WhatsApp
 * finns). Tom e-post ger samma kod som en ogiltig ("email.invalid"), så
 * `errors.ts` behöver ingen ny text. Väntelistan (`waitlistFormSchema`)
 * bygger på `customerFormSchema` utan den här regeln.
 */
export const bookingFormSchema = customerFormSchema.superRefine((v, ctx) => {
  if (v.email === "") {
    ctx.addIssue({
      code: "custom",
      path: ["email"],
      message: "email.invalid",
    });
  }
});

export type CustomerFormInput = z.input<typeof customerFormSchema>;
export type CustomerFormOutput = z.output<typeof customerFormSchema>;

/** Väntelistan: samma formulär men utan hora (ingen `slotId`, den full dagen
 * räcker), och en egen samtyckestext + version (FRÅGA 5c: `waitlist.terminos`,
 * versionerad separat i `waitlist.consentimientoVersion` — WP-03b, inte
 * `consentimientos.version`). */
export const waitlistFormSchema = customerFormSchema
  .omit({ slotId: true, consentVersion: true })
  .extend({
    date: z.string().min(1),
    consentVersion: z.literal(reserva.waitlist.consentimientoVersion),
  });

export type WaitlistFormInput = z.input<typeof waitlistFormSchema>;
export type WaitlistFormOutput = z.output<typeof waitlistFormSchema>;
