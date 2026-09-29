import "server-only";

import { market as installationMarket } from "@/config/brand";

import {
  EMAIL_TEMPLATE_KIND,
  renderEmail,
  type EmailTemplateMap,
  type EmailTemplateName,
} from "./render";
import type { EmailKind, RenderedEmail } from "./types";

/**
 * Klienten mot Resend (`POST /emails`, ingen SDK — INTEGRATIONS.md §4).
 * INTE inkopplad i bokningsflödet än (arbetspaket C): tänkt att anropas från
 * `message_outbox`-workern (`/api/cron/outbox`, regel hård 4), en rad i
 * taget, `FOR UPDATE SKIP LOCKED`. Se `docs/tech/INTEGRATIONS.md`.
 *
 * Skarpa anrop bara när miljövariablerna finns (regel: fake-implementation
 * annars) — annars `sendEmail` returnerar ett `provider: "fake"`-resultat
 * och skriver INGET till `console` (förbjudet i src/server, se
 * `boundaries.test.ts`): anroparen (utanför src/server) loggar om den vill,
 * med `maskEmail` från `../shared/mask`.
 */
export type SendEmailEnv = {
  readonly RESEND_API_KEY?: string | undefined;
  readonly EMAIL_FROM_BOOKING?: string | undefined;
  readonly EMAIL_FROM_ACCOUNT?: string | undefined;
};

export type SendEmailInput<T extends EmailTemplateName = EmailTemplateName> = {
  readonly to: string;
  readonly template: T;
  readonly data: EmailTemplateMap[T];
  /** Om utelämnat: slås upp från mallen (`EMAIL_TEMPLATE_KIND`). */
  readonly kind?: EmailKind;
  /** Dedupe/observabilitet i Resend (rekommenderas alltid av outbox-workern,
   * t.ex. `dedupe_key` från `message_outbox`). */
  readonly idempotencyKey?: string;
  /** Reply-To mot företaget (INTEGRATIONS.md, F7): sätts av anroparen när
   * företagets kontaktmejl finns. */
  readonly replyTo?: string;
  /** Bara för tester/design lab: forcerar marknad i stället för
   * installationens (`@/config/brand`). */
  readonly market?: "CL" | "SE";
};

export type SendEmailResult =
  | {
      readonly provider: "resend";
      readonly id: string;
      readonly rendered: RenderedEmail;
    }
  | {
      readonly provider: "fake";
      readonly id: string;
      readonly rendered: RenderedEmail;
    };

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function fromFor(kind: EmailKind, env: SendEmailEnv): string | undefined {
  return kind === "account" ? env.EMAIL_FROM_ACCOUNT : env.EMAIL_FROM_BOOKING;
}

/** Fejkad "utkorg": senaste skickade mejlen hålls i minnet (inte loggade —
 * `src/server` får aldrig `console.*`), så tester/design lab kan inspektera
 * dem. Rensas mellan tester med `resetFakeEmailOutbox`. */
const fakeOutbox: SendEmailResult[] = [];

export function fakeEmailOutbox(): readonly SendEmailResult[] {
  return fakeOutbox;
}

export function resetFakeEmailOutbox(): void {
  fakeOutbox.length = 0;
}

let fakeIdCounter = 0;
function nextFakeId(): string {
  fakeIdCounter += 1;
  return `fake_email_${fakeIdCounter}`;
}

export async function sendEmail<T extends EmailTemplateName>(
  input: SendEmailInput<T>,
  env: SendEmailEnv = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM_BOOKING: process.env.EMAIL_FROM_BOOKING,
    EMAIL_FROM_ACCOUNT: process.env.EMAIL_FROM_ACCOUNT,
  },
): Promise<SendEmailResult> {
  const market = input.market ?? installationMarket;
  const kind = input.kind ?? EMAIL_TEMPLATE_KIND[input.template];
  const rendered = renderEmail(input.template, market, input.data);

  const apiKey = env.RESEND_API_KEY;
  const from = fromFor(kind, env);

  if (!apiKey || !from) {
    const result: SendEmailResult = {
      provider: "fake",
      id: nextFakeId(),
      rendered,
    };
    fakeOutbox.push(result);
    return result;
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(input.idempotencyKey
        ? { "Idempotency-Key": input.idempotencyKey }
        : {}),
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
  });

  if (!res.ok) {
    // Aldrig `to`/persondata i felmeddelandet (regel hård 7).
    throw new Error(`Resend: skicka misslyckades (HTTP ${res.status})`);
  }

  const body = (await res.json()) as { id: string };
  return { provider: "resend", id: body.id, rendered };
}
