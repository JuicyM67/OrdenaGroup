import "server-only";

import type { MetaTemplateName } from "./config";

/**
 * Mallarna som WhatsApp-meddelanden (D-063). **Parameterordningen är
 * kontraktet** i `docs/content/whatsapp-templates.md` / `plantillasWhatsapp`
 * (`src/i18n/es-CL.panel.ts`): `{{1}}`, `{{2}}`… i exakt den ordning som står
 * där. `templates.test.ts` bygger varje mall med kontraktets exempelvärden
 * och kräver att parametrarna kommer i samma ordning som variablerna.
 *
 * Bara parametrarna skickas — själva texten ligger hos Meta (godkänd mall).
 * Språk `es` (Meta har ingen `es_CL`, R4 i WP-03).
 *
 * Quick reply-knapparna får en payload som Meta skickar tillbaka i
 * webhooken. Payloaden bär bara ÅTGÄRDEN (och för väntelistan starttiden som
 * erbjöds); vem och vilken bokning/post slås alltid upp via vårt eget
 * meddelandes id (`context.id` → `message_outbox.wa_message_id`), aldrig ur
 * payloaden (se `webhook.ts`).
 */

export const WHATSAPP_LANGUAGE = "es";

/** Utkorgens interna mallnamn → Meta-namnet. */
export const OUTBOX_TO_META = {
  reservaConfirmada: "reserva_confirmada",
  recordatorio: "recordatorio_24h",
  reservaCancelada: "reserva_cancelada",
  reservaMovida: "reserva_movida",
  listaEsperaCupo: "lista_espera_oferta",
  listaEsperaTomada: "lista_espera_tomada",
} as const satisfies Record<string, MetaTemplateName>;

export type WhatsAppOutboxTemplate = keyof typeof OUTBOX_TO_META;

export function isWhatsAppOutboxTemplate(
  t: string,
): t is WhatsAppOutboxTemplate {
  return Object.hasOwn(OUTBOX_TO_META, t);
}

export function metaNameFor(t: WhatsAppOutboxTemplate): MetaTemplateName {
  return OUTBOX_TO_META[t];
}

/** Payloads i quick reply-knapparna (webhooken känner igen dem). */
export const BUTTON_PAYLOAD = {
  confirmo: "confirmo",
  cambiar: "cambiar",
  /** `no:<offered_at i sekunder>` — vilket erbjudande som avböjs. */
  noPrefix: "no:",
  /** `si:<start i sekunder>:<offered_at i sekunder>` — tiden som erbjöds
   * och vilket erbjudande (sekventiellt läge kan erbjuda samma post igen). */
  siPrefix: "si:",
} as const;

export type WhatsAppTemplateParams = {
  reserva_confirmada: {
    negocio: string;
    cliente: string;
    servicio: string;
    fecha: string;
    hora: string;
    profesional: string;
    horasCancelacion: number;
    /** Sufijo del botón "Ver mi reserva" (`/r/{{1}}`). */
    token: string;
  };
  recordatorio_24h: {
    negocio: string;
    cliente: string;
    servicio: string;
    fecha: string;
    hora: string;
  };
  reserva_cancelada: {
    negocio: string;
    cliente: string;
    fecha: string;
    hora: string;
    /** Sufijo del botón "Reservar de nuevo" (`/{{1}}`). */
    slug: string;
  };
  reserva_movida: {
    negocio: string;
    cliente: string;
    fecha: string;
    hora: string;
    profesional: string;
    token: string;
  };
  lista_espera_oferta: {
    negocio: string;
    cliente: string;
    servicio: string;
    fecha: string;
    hora: string;
    minutos: number;
    /** Starttiden som erbjuds (ms sedan epoch) — bärs i "Sí"-knappen. */
    startMs: number;
    /** `waitlist_entries.offered_at` (ms) — bärs i båda knapparna. */
    offeredMs: number;
  };
  lista_espera_tomada: {
    negocio: string;
    cliente: string;
    fecha: string;
  };
};

type TextParameter = { type: "text"; text: string };
type PayloadParameter = { type: "payload"; payload: string };

export type TemplateComponent =
  | { type: "body"; parameters: TextParameter[] }
  | {
      type: "button";
      sub_type: "url";
      index: string;
      parameters: TextParameter[];
    }
  | {
      type: "button";
      sub_type: "quick_reply";
      index: string;
      parameters: PayloadParameter[];
    };

export type BuiltTemplate = {
  name: MetaTemplateName;
  language: { code: typeof WHATSAPP_LANGUAGE };
  components: TemplateComponent[];
};

/** Metas regler för en textparameter: inga radbrytningar/tabbar, högst fyra
 * mellanslag i rad, inte tom. Vi trimmar och slår ihop blanktecken; en tom
 * parameter blir "-" (Meta avvisar annars hela meddelandet med 131008). */
export function sanitizeParam(value: string | number): string {
  const s = String(value)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
  const capped = s.length > 1000 ? s.slice(0, 1000) : s;
  return capped === "" ? "-" : capped;
}

/** "primera palabra de customers.name" (kontraktet, variabel 2). */
export function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first && first !== "" ? first : name.trim();
}

function body(values: readonly (string | number)[]): TemplateComponent {
  return {
    type: "body",
    parameters: values.map((v) => ({ type: "text", text: sanitizeParam(v) })),
  };
}

function urlButton(index: number, suffix: string): TemplateComponent {
  return {
    type: "button",
    sub_type: "url",
    index: String(index),
    parameters: [{ type: "text", text: suffix }],
  };
}

function quickReply(index: number, payload: string): TemplateComponent {
  return {
    type: "button",
    sub_type: "quick_reply",
    index: String(index),
    parameters: [{ type: "payload", payload }],
  };
}

function built(
  name: MetaTemplateName,
  components: TemplateComponent[],
): BuiltTemplate {
  return { name, language: { code: WHATSAPP_LANGUAGE }, components };
}

/** Bygger meddelandet för mallen, parametrarna i kontraktets ordning. */
export function buildTemplate<N extends MetaTemplateName>(
  name: N,
  p: WhatsAppTemplateParams[N],
): BuiltTemplate {
  switch (name) {
    case "reserva_confirmada": {
      const x = p as WhatsAppTemplateParams["reserva_confirmada"];
      return built(name, [
        body([
          x.negocio,
          x.cliente,
          x.servicio,
          x.fecha,
          x.hora,
          x.profesional,
          x.horasCancelacion,
        ]),
        urlButton(0, x.token),
      ]);
    }
    case "recordatorio_24h": {
      const x = p as WhatsAppTemplateParams["recordatorio_24h"];
      return built(name, [
        body([x.negocio, x.cliente, x.servicio, x.fecha, x.hora]),
        quickReply(0, BUTTON_PAYLOAD.confirmo),
        quickReply(1, BUTTON_PAYLOAD.cambiar),
      ]);
    }
    case "reserva_cancelada": {
      const x = p as WhatsAppTemplateParams["reserva_cancelada"];
      return built(name, [
        body([x.negocio, x.cliente, x.fecha, x.hora]),
        urlButton(0, x.slug),
      ]);
    }
    case "reserva_movida": {
      const x = p as WhatsAppTemplateParams["reserva_movida"];
      return built(name, [
        body([x.negocio, x.cliente, x.fecha, x.hora, x.profesional]),
        urlButton(0, x.token),
      ]);
    }
    case "lista_espera_oferta": {
      const x = p as WhatsAppTemplateParams["lista_espera_oferta"];
      return built(name, [
        body([x.negocio, x.cliente, x.servicio, x.fecha, x.hora, x.minutos]),
        quickReply(
          0,
          `${BUTTON_PAYLOAD.siPrefix}${Math.floor(x.startMs / 1000)}:${Math.floor(x.offeredMs / 1000)}`,
        ),
        quickReply(
          1,
          `${BUTTON_PAYLOAD.noPrefix}${Math.floor(x.offeredMs / 1000)}`,
        ),
      ]);
    }
    case "lista_espera_tomada": {
      const x = p as WhatsAppTemplateParams["lista_espera_tomada"];
      return built(name, [body([x.negocio, x.cliente, x.fecha])]);
    }
    /* c8 ignore next 2 */
    default:
      throw new Error(`buildTemplate: okänd mall "${String(name)}"`);
  }
}

export type ParsedButtonPayload =
  | { action: "confirmo" | "cambiar" }
  | { action: "no"; offeredMs: number }
  | { action: "si"; startMs: number; offeredMs: number };

const EPOCH_S = "(\\d{9,11})";
const SI_RE = new RegExp(`^si:${EPOCH_S}:${EPOCH_S}$`);
const NO_RE = new RegExp(`^no:${EPOCH_S}$`);

/** Tolkar payloaden från ett knappsvar; `null` = okänd (ignoreras). */
export function parseButtonPayload(raw: unknown): ParsedButtonPayload | null {
  if (typeof raw !== "string" || raw.length > 64) return null;
  if (raw === BUTTON_PAYLOAD.confirmo) return { action: "confirmo" };
  if (raw === BUTTON_PAYLOAD.cambiar) return { action: "cambiar" };
  const si = SI_RE.exec(raw);
  if (si) {
    return {
      action: "si",
      startMs: Number(si[1]) * 1000,
      offeredMs: Number(si[2]) * 1000,
    };
  }
  const no = NO_RE.exec(raw);
  if (no) return { action: "no", offeredMs: Number(no[1]) * 1000 };
  return null;
}
