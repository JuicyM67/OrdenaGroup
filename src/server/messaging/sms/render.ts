import "server-only";

import type { Market } from "@/config/brand";

import { smsNs } from "./content";
import { smsLengthInfo, type SmsLengthInfo } from "./gsm7";

/** Samma mallnamn som `sms.*` i i18n (es-CL.ts/sv-SE.app.ts), utom `pie`
 * (STOPP/STOP) som `sendSms` lägger till separat — se `send.ts`. */
export type SmsTemplateMap = {
  readonly reservaConfirmada: {
    negocio: string;
    fecha: string;
    hora: string;
    link: string;
    /** WP-54: "$16.200 (-$1.800)" (ASCII "-", GSM-7) när medlemsrabatt finns. */
    precioSocio?: string;
    /** WP-31: samma format när rabatten kommer från en erbjudandelänk. */
    precioOferta?: string;
  };
  readonly recordatorio: {
    negocio: string;
    fecha: string;
    hora: string;
    link: string;
  };
  readonly recordatorioHoy: { negocio: string; hora: string; link: string };
  readonly reservaMovida: {
    negocio: string;
    fecha: string;
    hora: string;
    link: string;
  };
  readonly reservaCancelada: {
    negocio: string;
    fecha: string;
    hora: string;
    link: string;
  };
  /** WP-45 (D-033): förfrågan nekad/utgången. SE: samma kanaler som
   * `reservaCancelada` ("Ägarens svar" 2). CL skickas inte ännu (bara
   * e-post tills WP-22:s WhatsApp-mall finns) — typen finns ändå för
   * paritet med `sv-SE.app.ts`. */
  readonly solicitudRechazada: {
    negocio: string;
    fecha: string;
    hora: string;
    link: string;
  };
  readonly solicitudVencida: {
    negocio: string;
    fecha: string;
    hora: string;
    link: string;
  };
  readonly listaEsperaCupo: {
    negocio: string;
    servicio: string;
    fecha: string;
    hora: string;
    link: string;
    minutos: number;
  };
  /** WP-23: al cliente, la hora ofrecida ya fue tomada por otra persona. */
  readonly listaEsperaTomada: { negocio: string; fecha: string };
  readonly horaFlash: {
    negocio: string;
    hora: string;
    pct: number;
    link: string;
  };
  readonly nuevaReservaDueno: {
    cliente: string;
    servicio: string;
    fecha: string;
    hora: string;
  };
  /** WP-56: till företaget (SE, `businesses.phone` om mobil). `link` =
   * `/app/solicitudes/{id}`. */
  readonly nuevaSolicitudDueno: {
    cliente: string;
    fecha: string;
    hora: string;
    link: string;
  };
  readonly solicitudCancelacionDueno: {
    cliente: string;
    fecha: string;
    hora: string;
    link: string;
  };
  /** WP-56: till kunden, avbokningen godkändes inte. */
  readonly cancelacionRechazada: {
    negocio: string;
    fecha: string;
    hora: string;
    telefono?: string;
  };
  readonly codigoAcceso: { codigo: string };
  /** WP-55: mensaje libre desde la ficha del cliente (`message_outbox`,
   * `recipient_kind = 'customer'`, sin `booking_id`) — ver `worker.ts`
   * `loadFreeMessageContext`/`processFreeMessageRow`. */
  readonly mensajeLibre: { negocio: string; texto: string };
  /** WP-31: campaña de marketing (texto libre + oferta opcional). El link
   * de baja va INCLUIDO en el texto (no vía `SMS_MARKETING_TEMPLATES`/
   * `sms.pie`, que es la línea "Responde STOP" pensada para WhatsApp —
   * acá la baja es el link web `/baja/[token]`, ver `worker.ts`
   * `processCampaignRow`). */
  readonly campanaMarketing: {
    negocio: string;
    texto: string;
    link: string;
    bajaLink: string;
  };
  /** WP-65 (D-045): pedir reseña después de una cita realizada. */
  readonly solicitudResena: { negocio: string; link: string };
};

export type SmsTemplateName = keyof SmsTemplateMap;

export const SMS_TEMPLATE_NAMES: readonly SmsTemplateName[] = [
  "reservaConfirmada",
  "recordatorio",
  "recordatorioHoy",
  "reservaMovida",
  "reservaCancelada",
  "solicitudRechazada",
  "solicitudVencida",
  "listaEsperaCupo",
  "listaEsperaTomada",
  "horaFlash",
  "nuevaReservaDueno",
  "nuevaSolicitudDueno",
  "solicitudCancelacionDueno",
  "cancelacionRechazada",
  "codigoAcceso",
  "mensajeLibre",
  "campanaMarketing",
  "solicitudResena",
];

/** `hora_flash` (marketing, INTEGRATIONS.md §1): mallarna som kräver
 * `consent_marketing_at` + kontroll att kunden inte svarat BAJA/STOPP och
 * kvot mot planen (samma regel som mejl/WhatsApp) — kontrolleras av
 * outbox-workern (arbetspaket C), inte här. */
export const SMS_MARKETING_TEMPLATES: readonly SmsTemplateName[] = [
  "horaFlash",
];

export type RenderedSms = {
  readonly text: string;
} & SmsLengthInfo;

/** Renderar en SMS-mall. Lägger INTE till `sms.pie` (STOPP-raden) —
 * `sendSms` gör det bara för mallar med `withOptOut` (se `send.ts`), så att
 * t.ex. `codigoAcceso` inte får en irrelevant "Responde STOP". */
export function renderSms<T extends SmsTemplateName>(
  template: T,
  market: Market,
  data: SmsTemplateMap[T],
): RenderedSms {
  const ns = smsNs(market);
  const fn = ns[template] as (p: SmsTemplateMap[T]) => string;
  const text = fn(data);
  return { text, ...smsLengthInfo(text) };
}

/** `sms.pie` — línea de baja (STOPP/STOP), para quien arme el envío. */
export function smsOptOutLine(market: Market): string {
  return smsNs(market).pie;
}
