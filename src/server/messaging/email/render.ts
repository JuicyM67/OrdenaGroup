import "server-only";

import type { Market } from "@/config/brand";

import {
  confirmationEmail,
  magicLinkEmail,
  type AccesoEmailData,
} from "./templates/acceso";
import {
  cancelacionRechazadaEmail,
  recordatorioEmail,
  reservaCanceladaEmail,
  reservaConfirmadaEmail,
  reservaMovidaEmail,
  solicitudRecibidaEmail,
  solicitudRechazadaEmail,
  solicitudVencidaEmail,
  type CancelacionRechazadaData,
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
  bienvenidaMiembroEmail,
  type BienvenidaMiembroData,
} from "./templates/bienvenida-miembro";
import {
  campanaMarketingEmail,
  type CampanaMarketingData,
} from "./templates/campana-marketing";
import {
  cancelacionDuenoEmail,
  nuevaReservaDuenoEmail,
  nuevaSolicitudEmail,
  solicitudCancelacionEmail,
  type DuenoReservaData,
} from "./templates/dueno";
import { horaFlashEmail, type HoraFlashData } from "./templates/hora-flash";
import {
  solicitudResenaEmail,
  type SolicitudResenaData,
} from "./templates/solicitud-resena";
import {
  invitacionEquipoEmail,
  type InvitacionEquipoData,
} from "./templates/invitacion-equipo";
import {
  invitacionNegocioEmail,
  type InvitacionNegocioData,
} from "./templates/invitacion";
import {
  listaEsperaCupoEmail,
  listaEsperaTomadaEmail,
  type ListaEsperaCupoData,
  type ListaEsperaTomadaData,
} from "./templates/lista-espera";
import {
  smsAgotadosEmail,
  smsCuota80Email,
  type SmsAvisoData,
} from "./templates/sms-creditos";
import { valeCompradoEmail, type ValeCompradoData } from "./templates/vale";
import {
  presentkortKvittoEmail,
  presentkortLeveransEmail,
  type PresentkortKvittoData,
  type PresentkortLeveransData,
} from "./templates/presentkort";
import type { EmailKind, RenderedEmail } from "./types";

/** En mall = { data, kind (`EMAIL_FROM_BOOKING`/`EMAIL_FROM_ACCOUNT`) }. */
export type EmailTemplateMap = {
  readonly magicLink: AccesoEmailData;
  readonly confirmation: AccesoEmailData;
  readonly bienvenida: BienvenidaData;
  /** F19/WP-36: invitación a crear un negocio desde `/admin`. */
  readonly invitacionNegocio: InvitacionNegocioData;
  readonly reservaConfirmada: ReservaConfirmadaData;
  readonly recordatorio: RecordatorioData;
  readonly reservaMovida: ReservaMovidaData;
  readonly reservaCancelada: ReservaCanceladaData;
  readonly nuevaReservaDueno: DuenoReservaData;
  readonly cancelacionDueno: DuenoReservaData;
  readonly listaEsperaCupo: ListaEsperaCupoData;
  /** WP-23: al cliente, la hora ofrecida ya fue tomada por otra persona. */
  readonly listaEsperaTomada: ListaEsperaTomadaData;
  readonly horaFlash: HoraFlashData;
  /** WP-45 (D-033): förfrågningar (`requested`). */
  readonly nuevaSolicitud: DuenoReservaData;
  readonly solicitudRecibida: SolicitudRecibidaData;
  readonly solicitudRechazada: SolicitudRechazadaData;
  readonly solicitudVencida: SolicitudVencidaData;
  /** WP-46 (D-034): invitación de personal, único canal en v1. */
  readonly invitacionEquipo: InvitacionEquipoData;
  /** WP-54: al cliente, cuando pasa a ser socio (transaccional). */
  readonly bienvenidaMiembro: BienvenidaMiembroData;
  /** WP-56: al dueño, avbokningsförfrågan (`cancel_requested`). */
  readonly solicitudCancelacion: DuenoReservaData;
  /** WP-56: al cliente, el negocio no aceptó su cancelación. */
  readonly cancelacionRechazada: CancelacionRechazadaData;
  /** WP-31 (F14): campaña de marketing (`/app/clientes/utskick`). */
  readonly campanaMarketing: CampanaMarketingData;
  /** WP-65 (D-045): al cliente, pedir reseña después de la cita. */
  readonly solicitudResena: SolicitudResenaData;
  /** WP-76 (D-053): al dueño, avisos de SMS (80 % / agotados). */
  readonly smsCuota80: SmsAvisoData;
  readonly smsAgotados: SmsAvisoData;
  /** WP-69 (D-057): al comprador, recibo del vale. */
  readonly valeComprado: ValeCompradoData;
  /** WP-77 (D-058): presentkort — kvitto till köparen, leverans till mottagaren. */
  readonly presentkortKvitto: PresentkortKvittoData;
  readonly presentkortLeverans: PresentkortLeveransData;
};

export type EmailTemplateName = keyof EmailTemplateMap;

/** `EMAIL_FROM_BOOKING` para todo lo relacionado con una reserva/oferta,
 * `EMAIL_FROM_ACCOUNT` para el acceso y el correo de bienvenida (D-026,
 * INTEGRATIONS.md §4). */
export const EMAIL_TEMPLATE_KIND: Record<EmailTemplateName, EmailKind> = {
  magicLink: "account",
  confirmation: "account",
  bienvenida: "account",
  invitacionNegocio: "account",
  reservaConfirmada: "booking",
  recordatorio: "booking",
  reservaMovida: "booking",
  reservaCancelada: "booking",
  nuevaReservaDueno: "booking",
  cancelacionDueno: "booking",
  listaEsperaCupo: "booking",
  listaEsperaTomada: "booking",
  horaFlash: "booking",
  nuevaSolicitud: "booking",
  solicitudRecibida: "booking",
  solicitudRechazada: "booking",
  solicitudVencida: "booking",
  // Acceso a la cuenta, no una reserva (D-026/INTEGRATIONS.md §4): mismo
  // remitente que `magicLink`/`bienvenida` (`EMAIL_FROM_ACCOUNT`).
  invitacionEquipo: "account",
  bienvenidaMiembro: "booking",
  solicitudCancelacion: "booking",
  cancelacionRechazada: "booking",
  campanaMarketing: "booking",
  solicitudResena: "booking",
  smsCuota80: "account",
  smsAgotados: "account",
  valeComprado: "booking",
  presentkortKvitto: "booking",
  presentkortLeverans: "booking",
};

export const EMAIL_TEMPLATE_NAMES: readonly EmailTemplateName[] = [
  "magicLink",
  "confirmation",
  "bienvenida",
  "invitacionNegocio",
  "reservaConfirmada",
  "recordatorio",
  "reservaMovida",
  "reservaCancelada",
  "nuevaReservaDueno",
  "cancelacionDueno",
  "listaEsperaCupo",
  "listaEsperaTomada",
  "horaFlash",
  "nuevaSolicitud",
  "solicitudRecibida",
  "solicitudRechazada",
  "solicitudVencida",
  "invitacionEquipo",
  "bienvenidaMiembro",
  "solicitudCancelacion",
  "cancelacionRechazada",
  "campanaMarketing",
  "solicitudResena",
  "smsCuota80",
  "smsAgotados",
  "valeComprado",
  "presentkortKvitto",
  "presentkortLeverans",
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
    case "invitacionNegocio":
      return invitacionNegocioEmail(market, data as InvitacionNegocioData);
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
    case "listaEsperaTomada":
      return listaEsperaTomadaEmail(market, data as ListaEsperaTomadaData);
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
    case "invitacionEquipo":
      return invitacionEquipoEmail(market, data as InvitacionEquipoData);
    case "bienvenidaMiembro":
      return bienvenidaMiembroEmail(market, data as BienvenidaMiembroData);
    case "solicitudCancelacion":
      return solicitudCancelacionEmail(market, data as DuenoReservaData);
    case "cancelacionRechazada":
      return cancelacionRechazadaEmail(
        market,
        data as CancelacionRechazadaData,
      );
    case "campanaMarketing":
      return campanaMarketingEmail(market, data as CampanaMarketingData);
    case "solicitudResena":
      return solicitudResenaEmail(market, data as SolicitudResenaData);
    case "smsCuota80":
      return smsCuota80Email(market, data as SmsAvisoData);
    case "smsAgotados":
      return smsAgotadosEmail(market, data as SmsAvisoData);
    case "valeComprado":
      return valeCompradoEmail(market, data as ValeCompradoData);
    case "presentkortKvitto":
      return presentkortKvittoEmail(market, data as PresentkortKvittoData);
    case "presentkortLeverans":
      return presentkortLeveransEmail(market, data as PresentkortLeveransData);
    /* c8 ignore next 2 */
    default:
      throw new Error(`renderEmail: mall desconocida "${String(template)}"`);
  }
}
