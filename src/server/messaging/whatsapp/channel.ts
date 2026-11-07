import "server-only";

import {
  readWhatsAppEnv,
  whatsappTemplateEnabled,
  type WhatsAppEnv,
} from "./config";
import { isChileanMobile } from "./phone";
import { isWhatsAppOutboxTemplate, metaNameFor } from "./templates";

/**
 * Kanalval för ett kundmeddelande (D-063). Ren funktion — samma regel vid
 * köningen (`enqueue.ts`) och vid sändningen (`worker.ts`, där den
 * avgör på nytt: samtycket kan ha getts eller återkallats under tiden).
 *
 * WhatsApp när ALLT gäller:
 *  1. mallen har en WhatsApp-version (de sex i fas 1),
 *  2. kunden har ett aktivt WhatsApp-samtycke (`consent_events`),
 *  3. chilenskt mobilnummer (`+569…`),
 *  4. WhatsApp är konfigurerat (`live`/`fake`) och mallen står i
 *     `WHATSAPP_TEMPLATES_APPROVED`,
 *  5. raden har inte redan fallit tillbaka från WhatsApp (`fallback_reason`).
 *
 * Annars e-post om kunden har en, annars ingen kanal (raden köas inte /
 * avbryts — samma som innan WhatsApp fanns).
 */
export type CustomerChannelInput = {
  template: string;
  hasEmail: boolean;
  phone: string | null | undefined;
  whatsappConsent: boolean;
  /** `message_outbox.fallback_reason` satt = försök aldrig WhatsApp igen. */
  whatsappBlocked?: boolean;
  env?: WhatsAppEnv;
};

/** Allt utom samtycket — avgör om samtycket ens behöver slås upp. */
export function whatsappPossible(
  template: string,
  phone: string | null | undefined,
  env: WhatsAppEnv = readWhatsAppEnv(),
): boolean {
  if (!isWhatsAppOutboxTemplate(template)) return false;
  if (!isChileanMobile(phone)) return false;
  return whatsappTemplateEnabled(metaNameFor(template), env);
}

export function chooseCustomerChannel(
  input: CustomerChannelInput,
): "whatsapp" | "email" | null {
  const wa =
    !input.whatsappBlocked &&
    input.whatsappConsent &&
    whatsappPossible(input.template, input.phone, input.env);
  if (wa) return "whatsapp";
  return input.hasEmail ? "email" : null;
}
