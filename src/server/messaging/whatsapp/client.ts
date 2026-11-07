import "server-only";

import { randomUUID } from "node:crypto";

import { maskPhone } from "@/server/messaging/shared/mask";

import {
  graphVersion,
  readWhatsAppEnv,
  whatsappSendMode,
  type WhatsAppEnv,
} from "./config";
import { classifyWhatsAppError, WhatsAppSendError } from "./errors";
import type { BuiltTemplate } from "./templates";

/**
 * Klienten mot WhatsApp Cloud API (`POST /{version}/{phone-number-id}/messages`,
 * ingen SDK — samma stil som e-postens Resend-klient). Bara mallmeddelanden
 * (business-initiated, utanför 24 h-fönstret krävs en godkänd mall).
 *
 * Fake-läget (`WHATSAPP_FAKE=1` utan nycklar, se `config.ts`) skickar inget:
 * meddelandet sparas i minnet (`fakeWhatsAppOutbox`) med maskerat nummer, så
 * att tester/e2e kan inspektera det. Inget skrivs till `console` (förbjudet
 * i `src/server`, `boundaries.test.ts`) och inget telefonnummer i klartext
 * lämnar funktionen i fel eller resultat (regel 7).
 */

export type SendWhatsAppInput = {
  /** E.164 (`+56912345678`). */
  readonly to: string;
  readonly template: BuiltTemplate;
};

export type SendWhatsAppResult = {
  readonly provider: "meta" | "fake";
  /** Metas meddelande-id (`wamid.…`), `fake_wa_<uuid>` eller `""` (se nedan). */
  readonly id: string;
};

export type FakeWhatsAppMessage = {
  readonly id: string;
  readonly toMasked: string;
  readonly template: BuiltTemplate;
};

const fakeOutbox: FakeWhatsAppMessage[] = [];

export function fakeWhatsAppOutbox(): readonly FakeWhatsAppMessage[] {
  return fakeOutbox;
}

export function resetFakeWhatsAppOutbox(): void {
  fakeOutbox.length = 0;
}

/** Metas `to`: bara siffror, utan "+" (wa_id-formen). */
export function toWaRecipient(e164: string): string {
  return e164.replace(/^\+/, "");
}

type GraphErrorBody = { error?: { code?: unknown } };
type GraphOkBody = { messages?: { id?: unknown }[] };

export async function sendWhatsAppTemplate(
  input: SendWhatsAppInput,
  env: WhatsAppEnv = readWhatsAppEnv(),
  fetchImpl: typeof fetch = fetch,
): Promise<SendWhatsAppResult> {
  const mode = whatsappSendMode(env);
  if (mode === "off") {
    throw new WhatsAppSendError("permanent", "wa_not_configured");
  }
  if (mode === "fake") {
    // Unikt över processer (wa_message_id är unikt i databasen).
    const id = `fake_wa_${randomUUID()}`;
    fakeOutbox.push({
      id,
      toMasked: maskPhone(input.to),
      template: input.template,
    });
    return { provider: "fake", id };
  }

  const url = `https://graph.facebook.com/${graphVersion(env)}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toWaRecipient(input.to),
        type: "template",
        template: input.template,
      }),
    });
  } catch {
    // Nätverk/DNS/timeout: tillfälligt. Felet från fetch kan innehålla URL:en
    // (med phone-number-id) — det släpps aldrig vidare.
    throw new WhatsAppSendError("temporary", "wa_network");
  }

  if (!res.ok) {
    let code: number | undefined;
    try {
      const b = (await res.json()) as GraphErrorBody;
      code = typeof b.error?.code === "number" ? b.error.code : undefined;
    } catch {
      code = undefined;
    }
    const c = classifyWhatsAppError({ httpStatus: res.status, code });
    throw new WhatsAppSendError(c.kind, c.code);
  }

  let id: unknown;
  try {
    const b = (await res.json()) as GraphOkBody;
    id = b.messages?.[0]?.id;
  } catch {
    id = undefined;
  }
  // Accepterat (2xx) men utan id (ska inte hända): meddelandet är ändå
  // skickat — ett nytt försök eller e-post skulle ge kunden en dubblett.
  // Utan id kan statusar och knappsvar inte kopplas till raden.
  return { provider: "meta", id: typeof id === "string" ? id : "" };
}
