import "server-only";

import { brand, type Market } from "@/config/brand";
import * as Es from "@/i18n/es-CL";
import * as Sv from "@/i18n/sv-SE.app";

import {
  emailNs,
  gestionCampos,
  nuevaReservaCta,
  precioLabel,
} from "../content";
import {
  bookingCard,
  button,
  footerHtml,
  heading,
  renderLayout,
  textToHtmlParagraphs,
  type BookingCardRow,
} from "../layout";
import type { BookingCardData, RenderedEmail } from "../types";

function reservaConfirmacionTitulo(market: Market): string {
  return (market === "SE" ? Sv.reserva : Es.reserva).confirmacion.titulo;
}

function cardRows(market: Market, data: BookingCardData): BookingCardRow[] {
  const campos = gestionCampos(market);
  const rows: BookingCardRow[] = [
    { label: campos.servicio, value: data.servicio },
    { label: campos.dia, value: data.fecha },
    { label: campos.hora, value: data.hora },
  ];
  if (data.profesional)
    rows.push({ label: campos.profesional, value: data.profesional });
  if (data.direccion)
    rows.push({ label: campos.direccion, value: data.direccion });
  if (data.precio)
    rows.push({ label: precioLabel(market), value: data.precio });
  return rows;
}

/** CTA-text för bokningsmejlen ("Ver mi reserva"/"Se min bokning"): den nya
 * `email.comun`-satsen (copywriter-es-cl), inte `reserva.confirmacion.
 * verMiReserva` (samma ord, men tänkt för själva Reserva-sidan). */
function verMiReserva(market: Market): string {
  return emailNs(market).comun.verReserva;
}

function pieFooter(
  market: Market,
  negocio: string,
): { html: string; text: string } {
  const pie = emailNs(market).pie({ negocio, plataforma: brand.name });
  return { html: footerHtml([pie]), text: pie };
}

export type ReservaConfirmadaData = BookingCardData & {
  readonly cliente: string;
  readonly negocio: string;
  /** El `cuerpo` de `reservaConfirmada` siempre nombra al profesional. */
  readonly profesional: string;
  readonly horasCancelacion: number;
  readonly linkGestion: string;
  /** Línea de abono (D-022/F11), agregada aparte del cuerpo base. */
  readonly abono?: {
    readonly monto: string;
    readonly saldo: string;
    readonly condiciones: string;
  };
};

export function reservaConfirmadaEmail(
  market: Market,
  data: ReservaConfirmadaData,
): RenderedEmail {
  const ns = emailNs(market).reservaConfirmada;
  const asunto = ns.asunto({ negocio: data.negocio });
  const preheader = ns.preheader(data);
  const cuerpo = ns.cuerpo(data);
  const titulo = reservaConfirmacionTitulo(market);
  const abonoLine = data.abono
    ? emailNs(market).abono.lineaConfirmacion(data.abono)
    : null;
  const bodyHtml =
    heading(titulo) +
    bookingCard(cardRows(market, data)) +
    (abonoLine ? textToHtmlParagraphs(abonoLine) : "") +
    button(data.linkGestion, verMiReserva(market));
  const { html: footHtml, text: footText } = pieFooter(market, data.negocio);
  const { html, text } = renderLayout({
    market,
    preheader,
    bodyHtml,
    bodyText: `${titulo}\n\n${cuerpo}`,
    footerHtml: footHtml,
    footerText: footText,
  });
  return { subject: asunto, preheader, html, text };
}

export type RecordatorioData = BookingCardData & {
  readonly cliente: string;
  readonly negocio: string;
  readonly linkGestion: string;
};

export function recordatorioEmail(
  market: Market,
  data: RecordatorioData,
): RenderedEmail {
  const ns = emailNs(market).recordatorio24h;
  const asunto = ns.asunto({ negocio: data.negocio, fecha: data.fecha });
  const preheader = ns.preheader(data);
  const cuerpo = ns.cuerpo(data);
  const bodyHtml =
    bookingCard(cardRows(market, data)) +
    button(data.linkGestion, verMiReserva(market));
  const { html: footHtml, text: footText } = pieFooter(market, data.negocio);
  const { html, text } = renderLayout({
    market,
    preheader,
    bodyHtml,
    bodyText: cuerpo,
    footerHtml: footHtml,
    footerText: footText,
  });
  return { subject: asunto, preheader, html, text };
}

export type ReservaMovidaData = BookingCardData & {
  readonly cliente: string;
  readonly negocio: string;
  /** El `cuerpo` de `reservaMovida` siempre nombra al profesional. */
  readonly profesional: string;
  readonly linkGestion: string;
};

export function reservaMovidaEmail(
  market: Market,
  data: ReservaMovidaData,
): RenderedEmail {
  const ns = emailNs(market).reservaMovida;
  const asunto = ns.asunto({ negocio: data.negocio });
  const preheader = ns.preheader(data);
  const cuerpo = ns.cuerpo(data);
  const bodyHtml =
    bookingCard(cardRows(market, data)) +
    button(data.linkGestion, verMiReserva(market));
  const { html: footHtml, text: footText } = pieFooter(market, data.negocio);
  const { html, text } = renderLayout({
    market,
    preheader,
    bodyHtml,
    bodyText: cuerpo,
    footerHtml: footHtml,
    footerText: footText,
  });
  return { subject: asunto, preheader, html, text };
}

export type ReservaCanceladaData = {
  readonly cliente: string;
  readonly negocio: string;
  readonly fecha: string;
  readonly hora: string;
  readonly linkNuevaReserva: string;
};

export function reservaCanceladaEmail(
  market: Market,
  data: ReservaCanceladaData,
): RenderedEmail {
  const ns = emailNs(market).reservaCancelada;
  const asunto = ns.asunto({ negocio: data.negocio });
  const preheader = ns.preheader(data);
  const cuerpo = ns.cuerpo(data);
  const bodyHtml =
    textToHtmlParagraphs(cuerpo) +
    button(data.linkNuevaReserva, nuevaReservaCta(market), "lime");
  const { html: footHtml, text: footText } = pieFooter(market, data.negocio);
  const { html, text } = renderLayout({
    market,
    preheader,
    bodyHtml,
    bodyText: cuerpo,
    footerHtml: footHtml,
    footerText: footText,
  });
  return { subject: asunto, preheader, html, text };
}

// ---------------------------------------------------------------------------
// WP-45 (D-033): förfrågningar (`requested`) — mottagen, nekad, utgången.
// ---------------------------------------------------------------------------

export type SolicitudRecibidaData = BookingCardData & {
  readonly cliente: string;
  readonly negocio: string;
  readonly linkGestion: string;
};

/** Al cliente, apenas manda una solicitud (negocio con confirmación manual,
 * WP-45 steg 3): mismo patrón que `reservaConfirmadaEmail` (rubrik + card +
 * botón), pero con su propio `email.solicitudRecibida` — nunca se confunde
 * con `reservaConfirmada` (la reserva todavía no está confirmada). */
export function solicitudRecibidaEmail(
  market: Market,
  data: SolicitudRecibidaData,
): RenderedEmail {
  const ns = emailNs(market).solicitudRecibida;
  const asunto = ns.asunto({ negocio: data.negocio });
  const preheader = ns.preheader(data);
  const cuerpo = ns.texto(data);
  const bodyHtml =
    heading(ns.titulo) +
    bookingCard(cardRows(market, data)) +
    button(data.linkGestion, ns.cta);
  const { html: footHtml, text: footText } = pieFooter(market, data.negocio);
  const { html, text } = renderLayout({
    market,
    preheader,
    bodyHtml,
    bodyText: `${ns.titulo}\n\n${cuerpo}`,
    footerHtml: footHtml,
    footerText: footText,
  });
  return { subject: asunto, preheader, html, text };
}

export type SolicitudRechazadaData = {
  readonly cliente: string;
  readonly negocio: string;
  readonly fecha: string;
  readonly hora: string;
  readonly linkNuevaReserva: string;
  /** Motivo escrito por el negocio al rechazar
   * (`solicitudes.rechazarDialog.motivoLabel`, WP-45 steg 5, UI). El evento
   * del motor (`declined`) todavía no lo transporta — se omite hasta que
   * exista ese campo. */
  readonly motivo?: string;
};

/** Al cliente, cuando el negocio rechaza su solicitud. Mismo patrón que
 * `reservaCanceladaEmail` (cuerpo de texto plano + botón "reservar de
 * nuevo"), con su propio `email.solicitudRechazada`. */
export function solicitudRechazadaEmail(
  market: Market,
  data: SolicitudRechazadaData,
): RenderedEmail {
  const ns = emailNs(market).solicitudRechazada;
  const asunto = ns.asunto({ negocio: data.negocio });
  const preheader = ns.preheader(data);
  const cuerpo = ns.cuerpo(data);
  const bodyHtml =
    textToHtmlParagraphs(cuerpo) +
    button(data.linkNuevaReserva, nuevaReservaCta(market), "lime");
  const { html: footHtml, text: footText } = pieFooter(market, data.negocio);
  const { html, text } = renderLayout({
    market,
    preheader,
    bodyHtml,
    bodyText: cuerpo,
    footerHtml: footHtml,
    footerText: footText,
  });
  return { subject: asunto, preheader, html, text };
}

export type SolicitudVencidaData = {
  readonly cliente: string;
  readonly negocio: string;
  readonly fecha: string;
  readonly hora: string;
  readonly linkNuevaReserva: string;
};

/** Al cliente, cuando la solicitud vence antes de que el negocio la
 * confirme o la rechace (svepet/`expireRequests`, WP-45 steg 6). Mismo
 * patrón que `solicitudRechazadaEmail`, sin `motivo`. */
export function solicitudVencidaEmail(
  market: Market,
  data: SolicitudVencidaData,
): RenderedEmail {
  const ns = emailNs(market).solicitudVencida;
  const asunto = ns.asunto({ negocio: data.negocio });
  const preheader = ns.preheader(data);
  const cuerpo = ns.cuerpo(data);
  const bodyHtml =
    textToHtmlParagraphs(cuerpo) +
    button(data.linkNuevaReserva, nuevaReservaCta(market), "lime");
  const { html: footHtml, text: footText } = pieFooter(market, data.negocio);
  const { html, text } = renderLayout({
    market,
    preheader,
    bodyHtml,
    bodyText: cuerpo,
    footerHtml: footHtml,
    footerText: footText,
  });
  return { subject: asunto, preheader, html, text };
}
