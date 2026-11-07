import "server-only";

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
  clienteQuiereCambiarEmail,
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
  invitacionAdminEmail,
  invitacionNegocioEmail,
  type InvitacionAdminData,
  type InvitacionNegocioData,
} from "./templates/invitacion";
import {
  listaEsperaCupoEmail,
  listaEsperaTomadaEmail,
  type ListaEsperaCupoData,
  type ListaEsperaTomadaData,
} from "./templates/lista-espera";
import {
  tarjetaRegaloCompradorEmail,
  tarjetaRegaloDestinatarioEmail,
  type TarjetaRegaloCompradorData,
  type TarjetaRegaloDestinatarioData,
} from "./templates/tarjeta-regalo";
import type { EmailKind, RenderedEmail } from "./types";

/** En mall = { data, kind (`EMAIL_FROM_BOOKING`/`EMAIL_FROM_ACCOUNT`) }. */
export type EmailTemplateMap = {
  readonly magicLink: AccesoEmailData;
  readonly confirmation: AccesoEmailData;
  readonly bienvenida: BienvenidaData;
  /** F19/WP-36: invitación a crear un negocio desde `/admin`. */
  readonly invitacionNegocio: InvitacionNegocioData;
  /** WP-80 (D-061): agregado como administrador de la plataforma. */
  readonly invitacionAdmin: InvitacionAdminData;
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
  /** D-063: al dueño, el cliente respondió "Necesito cambiar" en WhatsApp. */
  readonly clienteQuiereCambiar: DuenoReservaData;
  /** WP-87 (D-073): tarjeta de regalo — comprobante al comprador, la
   * tarjeta a quien la recibe. */
  readonly tarjetaRegaloComprador: TarjetaRegaloCompradorData;
  readonly tarjetaRegaloDestinatario: TarjetaRegaloDestinatarioData;
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
  invitacionAdmin: "account",
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
  clienteQuiereCambiar: "booking",
  tarjetaRegaloComprador: "booking",
  tarjetaRegaloDestinatario: "booking",
};

export const EMAIL_TEMPLATE_NAMES: readonly EmailTemplateName[] = [
  "magicLink",
  "confirmation",
  "bienvenida",
  "invitacionNegocio",
  "invitacionAdmin",
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
  "clienteQuiereCambiar",
  "tarjetaRegaloComprador",
  "tarjetaRegaloDestinatario",
];

/** Renderar en mall: `{ subject, preheader, html, text }`, redo för
 * `sendEmail` eller för förhandsvisning (design lab, tester). */
export function renderEmail<T extends EmailTemplateName>(
  template: T,
  data: EmailTemplateMap[T],
): RenderedEmail {
  switch (template) {
    case "magicLink":
      return magicLinkEmail(data as AccesoEmailData);
    case "confirmation":
      return confirmationEmail(data as AccesoEmailData);
    case "bienvenida":
      return bienvenidaEmail(data as BienvenidaData);
    case "invitacionNegocio":
      return invitacionNegocioEmail(data as InvitacionNegocioData);
    case "invitacionAdmin":
      return invitacionAdminEmail(data as InvitacionAdminData);
    case "reservaConfirmada":
      return reservaConfirmadaEmail(data as ReservaConfirmadaData);
    case "recordatorio":
      return recordatorioEmail(data as RecordatorioData);
    case "reservaMovida":
      return reservaMovidaEmail(data as ReservaMovidaData);
    case "reservaCancelada":
      return reservaCanceladaEmail(data as ReservaCanceladaData);
    case "nuevaReservaDueno":
      return nuevaReservaDuenoEmail(data as DuenoReservaData);
    case "cancelacionDueno":
      return cancelacionDuenoEmail(data as DuenoReservaData);
    case "listaEsperaCupo":
      return listaEsperaCupoEmail(data as ListaEsperaCupoData);
    case "listaEsperaTomada":
      return listaEsperaTomadaEmail(data as ListaEsperaTomadaData);
    case "horaFlash":
      return horaFlashEmail(data as HoraFlashData);
    case "nuevaSolicitud":
      return nuevaSolicitudEmail(data as DuenoReservaData);
    case "solicitudRecibida":
      return solicitudRecibidaEmail(data as SolicitudRecibidaData);
    case "solicitudRechazada":
      return solicitudRechazadaEmail(data as SolicitudRechazadaData);
    case "solicitudVencida":
      return solicitudVencidaEmail(data as SolicitudVencidaData);
    case "invitacionEquipo":
      return invitacionEquipoEmail(data as InvitacionEquipoData);
    case "bienvenidaMiembro":
      return bienvenidaMiembroEmail(data as BienvenidaMiembroData);
    case "solicitudCancelacion":
      return solicitudCancelacionEmail(data as DuenoReservaData);
    case "cancelacionRechazada":
      return cancelacionRechazadaEmail(data as CancelacionRechazadaData);
    case "campanaMarketing":
      return campanaMarketingEmail(data as CampanaMarketingData);
    case "solicitudResena":
      return solicitudResenaEmail(data as SolicitudResenaData);
    case "clienteQuiereCambiar":
      return clienteQuiereCambiarEmail(data as DuenoReservaData);
    case "tarjetaRegaloComprador":
      return tarjetaRegaloCompradorEmail(data as TarjetaRegaloCompradorData);
    case "tarjetaRegaloDestinatario":
      return tarjetaRegaloDestinatarioEmail(
        data as TarjetaRegaloDestinatarioData,
      );
    /* c8 ignore next 2 */
    default:
      throw new Error(`renderEmail: mall desconocida "${String(template)}"`);
  }
}
