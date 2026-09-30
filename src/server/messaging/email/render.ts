import "server-only";

import type { Market } from "@/config/brand";

import {
  confirmationEmail,
  magicLinkEmail,
  type AccesoEmailData,
} from "./templates/acceso";
import {
  recordatorioEmail,
  reservaCanceladaEmail,
  reservaConfirmadaEmail,
  reservaMovidaEmail,
  solicitudRecibidaEmail,
  solicitudRechazadaEmail,
  solicitudVencidaEmail,
  type RecordatorioData,
  type ReservaCanceladaData,
  type ReservaConfirmadaData,
  type ReservaMovidaData,
  type SolicitudRecibidaData,
  type SolicitudRechazadaData,
  type SolicitudVencidaData,
} from "./templates/booking";
import { bienvenidaEmail, type BienvenidaData } from "./templates/bienvenida";
import {
  cancelacionDuenoEmail,
  nuevaReservaDuenoEmail,
  nuevaSolicitudEmail,
  type DuenoReservaData,
} from "./templates/dueno";
import { horaFlashEmail, type HoraFlashData } from "./templates/hora-flash";
import {
  listaEsperaCupoEmail,
  type ListaEsperaCupoData,
} from "./templates/lista-espera";
import type { EmailKind, RenderedEmail } from "./types";

/** En mall = { data, kind (`EMAIL_FROM_BOOKING`/`EMAIL_FROM_ACCOUNT`) }. */
export type EmailTemplateMap = {
  readonly magicLink: AccesoEmailData;
  readonly confirmation: AccesoEmailData;
  readonly bienvenida: BienvenidaData;
  readonly reservaConfirmada: ReservaConfirmadaData;
  readonly recordatorio: RecordatorioData;
  readonly reservaMovida: ReservaMovidaData;
  readonly reservaCancelada: ReservaCanceladaData;
  readonly nuevaReservaDueno: DuenoReservaData;
  readonly cancelacionDueno: DuenoReservaData;
  readonly listaEsperaCupo: ListaEsperaCupoData;
  readonly horaFlash: HoraFlashData;
  /** WP-45 (D-033): förfrågningar (`requested`). */
  readonly nuevaSolicitud: DuenoReservaData;
  readonly solicitudRecibida: SolicitudRecibidaData;
  readonly solicitudRechazada: SolicitudRechazadaData;
  readonly solicitudVencida: SolicitudVencidaData;
};

export type EmailTemplateName = keyof EmailTemplateMap;

/** `EMAIL_FROM_BOOKING` para todo lo relacionado con una reserva/oferta,
 * `EMAIL_FROM_ACCOUNT` para el acceso y el correo de bienvenida (D-026,
 * INTEGRATIONS.md §4). */
export const EMAIL_TEMPLATE_KIND: Record<EmailTemplateName, EmailKind> = {
  magicLink: "account",
  confirmation: "account",
  bienvenida: "account",
  reservaConfirmada: "booking",
  recordatorio: "booking",
  reservaMovida: "booking",
  reservaCancelada: "booking",
  nuevaReservaDueno: "booking",
  cancelacionDueno: "booking",
  listaEsperaCupo: "booking",
  horaFlash: "booking",
  nuevaSolicitud: "booking",
  solicitudRecibida: "booking",
  solicitudRechazada: "booking",
  solicitudVencida: "booking",
};

export const EMAIL_TEMPLATE_NAMES: readonly EmailTemplateName[] = [
  "magicLink",
  "confirmation",
  "bienvenida",
  "reservaConfirmada",
  "recordatorio",
  "reservaMovida",
  "reservaCancelada",
  "nuevaReservaDueno",
  "cancelacionDueno",
  "listaEsperaCupo",
  "horaFlash",
  "nuevaSolicitud",
  "solicitudRecibida",
  "solicitudRechazada",
  "solicitudVencida",
];

/** Renderar en mall: `{ subject, preheader, html, text }`, redo för
 * `sendEmail` eller för förhandsvisning (design lab, tester). */
export function renderEmail<T extends EmailTemplateName>(
  template: T,
  market: Market,
  data: EmailTemplateMap[T],
): RenderedEmail {
  switch (template) {
    case "magicLink":
      return magicLinkEmail(market, data as AccesoEmailData);
    case "confirmation":
      return confirmationEmail(market, data as AccesoEmailData);
    case "bienvenida":
      return bienvenidaEmail(market, data as BienvenidaData);
    case "reservaConfirmada":
      return reservaConfirmadaEmail(market, data as ReservaConfirmadaData);
    case "recordatorio":
      return recordatorioEmail(market, data as RecordatorioData);
    case "reservaMovida":
      return reservaMovidaEmail(market, data as ReservaMovidaData);
    case "reservaCancelada":
      return reservaCanceladaEmail(market, data as ReservaCanceladaData);
    case "nuevaReservaDueno":
      return nuevaReservaDuenoEmail(market, data as DuenoReservaData);
    case "cancelacionDueno":
      return cancelacionDuenoEmail(market, data as DuenoReservaData);
    case "listaEsperaCupo":
      return listaEsperaCupoEmail(market, data as ListaEsperaCupoData);
    case "horaFlash":
      return horaFlashEmail(market, data as HoraFlashData);
    case "nuevaSolicitud":
      return nuevaSolicitudEmail(market, data as DuenoReservaData);
    case "solicitudRecibida":
      return solicitudRecibidaEmail(market, data as SolicitudRecibidaData);
    case "solicitudRechazada":
      return solicitudRechazadaEmail(market, data as SolicitudRechazadaData);
    case "solicitudVencida":
      return solicitudVencidaEmail(market, data as SolicitudVencidaData);
    /* c8 ignore next 2 */
    default:
      throw new Error(`renderEmail: mall desconocida "${String(template)}"`);
  }
}
