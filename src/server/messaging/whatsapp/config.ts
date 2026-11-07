import "server-only";

/**
 * WhatsApp Cloud API (Meta, D-006/D-007/D-063): konfiguration.
 *
 * - `live` när `WHATSAPP_ACCESS_TOKEN` och `WHATSAPP_PHONE_NUMBER_ID` finns.
 * - `fake` när de saknas men `WHATSAPP_FAKE=1` (lokalt/CI/e2e) — aldrig i
 *   Vercels production-miljö, så att en glömd flagga inte tyst sväljer
 *   kundernas meddelanden.
 * - `off` annars: WhatsApp väljs aldrig och allt går som e-post (som före
 *   D-063).
 *
 * **Den enda konfigurationspunkten för vilka mallar som får skickas** är
 * `WHATSAPP_TEMPLATES_APPROVED`: kommaseparerade Meta-namn
 * (`recordatorio_24h,lista_espera_oferta,…`). En mall som inte står där går
 * som e-post. Ägaren lägger till namnet när Meta godkänt mallen — URL-mallarna
 * (`reserva_confirmada`, `reserva_cancelada`, `reserva_movida`) först när
 * domänen är bestämd (`dominioPendiente`, docs/content/whatsapp-templates.md).
 */

/** Meta-namnen för fas 1 (docs/content/whatsapp-templates.md). */
export const META_TEMPLATE_NAMES = [
  "reserva_confirmada",
  "recordatorio_24h",
  "reserva_cancelada",
  "reserva_movida",
  "lista_espera_oferta",
  "lista_espera_tomada",
] as const;

export type MetaTemplateName = (typeof META_TEMPLATE_NAMES)[number];

/** Graph API-versionen om ingen anges (kan bytas utan kodändring). */
export const DEFAULT_GRAPH_VERSION = "v23.0";

export type WhatsAppEnv = {
  readonly WHATSAPP_ACCESS_TOKEN?: string | undefined;
  readonly WHATSAPP_PHONE_NUMBER_ID?: string | undefined;
  readonly WHATSAPP_APP_SECRET?: string | undefined;
  readonly WHATSAPP_VERIFY_TOKEN?: string | undefined;
  readonly WHATSAPP_GRAPH_VERSION?: string | undefined;
  readonly WHATSAPP_TEMPLATES_APPROVED?: string | undefined;
  readonly WHATSAPP_FAKE?: string | undefined;
  readonly VERCEL_ENV?: string | undefined;
};

export function readWhatsAppEnv(): WhatsAppEnv {
  return {
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
    WHATSAPP_GRAPH_VERSION: process.env.WHATSAPP_GRAPH_VERSION,
    WHATSAPP_TEMPLATES_APPROVED: process.env.WHATSAPP_TEMPLATES_APPROVED,
    WHATSAPP_FAKE: process.env.WHATSAPP_FAKE,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
}

function present(v: string | undefined): v is string {
  return typeof v === "string" && v.trim() !== "";
}

export type WhatsAppSendMode = "live" | "fake" | "off";

export function whatsappSendMode(
  env: WhatsAppEnv = readWhatsAppEnv(),
): WhatsAppSendMode {
  if (
    present(env.WHATSAPP_ACCESS_TOKEN) &&
    present(env.WHATSAPP_PHONE_NUMBER_ID)
  ) {
    return "live";
  }
  if (env.WHATSAPP_FAKE === "1" && env.VERCEL_ENV !== "production") {
    return "fake";
  }
  return "off";
}

function isMetaTemplateName(v: string): v is MetaTemplateName {
  return (META_TEMPLATE_NAMES as readonly string[]).includes(v);
}

/** Okända namn (stavfel) ignoreras — de kan aldrig slå på något. */
export function approvedTemplates(
  env: WhatsAppEnv = readWhatsAppEnv(),
): ReadonlySet<MetaTemplateName> {
  const raw = env.WHATSAPP_TEMPLATES_APPROVED ?? "";
  const out = new Set<MetaTemplateName>();
  for (const part of raw.split(",")) {
    const name = part.trim();
    if (isMetaTemplateName(name)) out.add(name);
  }
  return out;
}

/** WhatsApp kan användas för mallen just nu (sändningsläge + godkänd). */
export function whatsappTemplateEnabled(
  name: MetaTemplateName,
  env: WhatsAppEnv = readWhatsAppEnv(),
): boolean {
  return whatsappSendMode(env) !== "off" && approvedTemplates(env).has(name);
}

export function graphVersion(env: WhatsAppEnv = readWhatsAppEnv()): string {
  const v = env.WHATSAPP_GRAPH_VERSION?.trim();
  return v && /^v\d+\.\d+$/.test(v) ? v : DEFAULT_GRAPH_VERSION;
}
