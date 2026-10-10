import "server-only";

import { brand, market as installationMarket } from "@/config/brand";

import {
  renderSms,
  smsOptOutLine,
  SMS_MARKETING_TEMPLATES,
  type SmsTemplateMap,
  type SmsTemplateName,
} from "./render";

/**
 * Klienten mot ClickSend (`POST https://rest.clicksend.com/v3/sms/send`,
 * Basic auth `CLICKSEND_USERNAME:CLICKSEND_API_KEY`). INTE inkopplad i
 * bokningsflödet (arbetspaket C): tänkt att anropas från
 * `message_outbox`-workern, precis som `../email/send.ts`.
 *
 * `CLICKSEND_USERNAME` saknas ännu i Vercel (bara `CLICKSEND_API_KEY`
 * finns för bookingbuddy) — `sendSms` kräver BÅDA för ett skarpt anrop och
 * faller annars till fejk-läget (aldrig ett halvt Basic-auth-anrop mot
 * ClickSend).
 */
export type SendSmsEnv = {
  readonly CLICKSEND_USERNAME?: string | undefined;
  readonly CLICKSEND_API_KEY?: string | undefined;
  readonly SMS_SENDER_ID?: string | undefined;
};

export type SendSmsInput<T extends SmsTemplateName = SmsTemplateName> = {
  /** E.164 (`src/lib/format/phone.ts`). */
  readonly to: string;
  readonly template: T;
  readonly data: SmsTemplateMap[T];
  /** `custom_string` i ClickSend — dedupe/observabilitet, t.ex.
   * `dedupe_key` från `message_outbox`. */
  readonly idempotencyKey?: string;
  readonly market?: "CL" | "SE";
  /** WP-76 (D-053): körs med den färdiga texten innan leverantören anropas
   * (workern reserverar sms-segment i kvoten/krediterna). Kastar den skickas
   * inget. */
  readonly beforeSend?: (text: string) => Promise<void>;
};

export type SendSmsResult =
  | {
      readonly provider: "clicksend";
      readonly id: string;
      readonly text: string;
    }
  | { readonly provider: "fake"; readonly id: string; readonly text: string };

const CLICKSEND_ENDPOINT = "https://rest.clicksend.com/v3/sms/send";
/** `from` för ClickSend: max 11 alfanumeriska tecken (GSM Sender ID). */
const MAX_SENDER_ID_LENGTH = 11;

function senderId(env: SendSmsEnv): string {
  const raw = env.SMS_SENDER_ID ?? brand.name.replace(/[^A-Za-z0-9]/g, "");
  return raw.slice(0, MAX_SENDER_ID_LENGTH);
}

const fakeOutbox: SendSmsResult[] = [];

export function fakeSmsOutbox(): readonly SendSmsResult[] {
  return fakeOutbox;
}

export function resetFakeSmsOutbox(): void {
  fakeOutbox.length = 0;
}

let fakeIdCounter = 0;
function nextFakeId(): string {
  fakeIdCounter += 1;
  return `fake_sms_${fakeIdCounter}`;
}

export async function sendSms<T extends SmsTemplateName>(
  input: SendSmsInput<T>,
  env: SendSmsEnv = {
    CLICKSEND_USERNAME: process.env.CLICKSEND_USERNAME,
    CLICKSEND_API_KEY: process.env.CLICKSEND_API_KEY,
    SMS_SENDER_ID: process.env.SMS_SENDER_ID,
  },
): Promise<SendSmsResult> {
  const market = input.market ?? installationMarket;
  const rendered = renderSms(input.template, market, input.data);
  // `pie` (STOPP/STOP) solo en las plantillas de marketing (`horaFlash`):
  // las utility (confirmación, recordatorio…) no llevan línea de baja.
  const text = SMS_MARKETING_TEMPLATES.includes(input.template)
    ? `${rendered.text}\n${smsOptOutLine(market)}`
    : rendered.text;
  await input.beforeSend?.(text);

  const username = env.CLICKSEND_USERNAME;
  const apiKey = env.CLICKSEND_API_KEY;

  if (!username || !apiKey) {
    const result: SendSmsResult = { provider: "fake", id: nextFakeId(), text };
    fakeOutbox.push(result);
    return result;
  }

  const res = await fetch(CLICKSEND_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${username}:${apiKey}`).toString("base64")}`,
    },
    body: JSON.stringify({
      messages: [
        {
          source: "sdk",
          from: senderId(env),
          to: input.to,
          body: text,
          ...(input.idempotencyKey
            ? { custom_string: input.idempotencyKey }
            : {}),
        },
      ],
    }),
  });

  if (!res.ok) {
    // Aldrig `to`/persondata i felmeddelandet (regel hård 7).
    throw new Error(`ClickSend: skicka misslyckades (HTTP ${res.status})`);
  }

  const body = (await res.json()) as {
    data?: { messages?: { message_id?: string }[] };
  };
  const id = body.data?.messages?.[0]?.message_id ?? "unknown";
  return { provider: "clicksend", id, text };
}
