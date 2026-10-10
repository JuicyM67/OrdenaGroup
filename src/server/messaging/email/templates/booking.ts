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

/** WP-54: "Precio socio: $16.200 (−$1.800)" för textversionen (kortet finns
 * bara i HTML). `null` utan medlemsrabatt. */
function precioSocioLine(market: Market, data: BookingCardData): string | null {
  if (!data.precio || !data.descuentoSocio) return null;
  const miembro = emailNs(market).miembro;
  const label = data.descuentoOferta
    ? miembro.precioOfertaLabel
    : miembro.precioLabel;
  return `${label}: ${miembro.precio({
    precio: data.precio,
    descuento: data.descuentoSocio,
  })}`;
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
  if (data.precio && data.descuentoSocio) {
    const miembro = emailNs(market).miembro;
    rows.push({
      label: data.descuentoOferta
        ? miembro.precioOfertaLabel
        : miembro.precioLabel,
      value: miembro.precio({
        precio: data.precio,
        descuento: data.descuentoSocio,
      }),
    });
  } else if (data.precio) {
    rows.push({ label: precioLabel(market), value: data.precio });
  }
  if (data.pago) {
    const pago = emailNs(market).pago;
    rows.push({ label: pago.label, value: pago[data.pago] });
  }
  return rows;
}

/** CTA-text för bokningsmejlen ("Ver mi reserva"/"Se min bokning"): den nya
 * `email.comun`-satsen (copywriter-es-cl), inte `reserva.confirmacion.
 * verMiReserva` (samma ord, men tänkt för själva Reserva-sidan). */
function verMiReserva(market: Market): string {
  return emailNs(market).comun.verReserva;
}

/** WP-64 (D-044): lägger till återbetalningsnotisen sist i brödtexten. */
function withReembolso(
  market: Market,
  cuerpo: string,
  reembolso: boolean | undefined,
): string {
  return reembolso
    ? `${cuerpo}\n\n${emailNs(market).pago.reembolsoNota}`
    : cuerpo;
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
    bodyText: [titulo, cuerpo, precioSocioLine(market, data)]
      .filter((x): x is string => x !== null)
      .join("\n\n"),
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
  /** WP-64 (D-044): kunden har betalat online och får pengarna tillbaka. */
  readonly reembolso?: boolean;
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
  const cuerpoFull = withReembolso(market, cuerpo, data.reembolso);
  const bodyHtml =
    textToHtmlParagraphs(cuerpoFull) +
    button(data.linkNuevaReserva, nuevaReservaCta(market), "lime");
  const { html: footHtml, text: footText } = pieFooter(market, data.negocio);
  const { html, text } = renderLayout({
    market,
    preheader,
    bodyHtml,
    bodyText: cuerpoFull,
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
    bodyText: [ns.titulo, cuerpo, precioSocioLine(market, data)]
      .filter((x): x is string => x !== null)
      .join("\n\n"),
    footerHtml: footHtml,
    footerText: footText,
  });
  return { subject: asunto, preheader, html, text };
}

export type SolicitudRechazadaData = {
  /** WP-64 (D-044): kunden har betalat online och får pengarna tillbaka. */
  readonly reembolso?: boolean;
  readonly cliente: string;
  readonly negocio: string;
  readonly fecha: string;
  readonly hora: string;
  readonly linkNuevaReserva: string;
  /** Motivo escrito por el negocio al rechazar
   * (`solicitudes.rechazarDialog.motivoLabel`). Viaja `declineBooking` →
   * `BookingEvent["declined"].message` → `message_outbox.payload.motivo`
   * (worker.ts) → acá; nunca se guarda en `bookings`. */
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
  const cuerpoFull = withReembolso(market, cuerpo, data.reembolso);
  const bodyHtml =
    textToHtmlParagraphs(cuerpoFull) +
    button(data.linkNuevaReserva, nuevaReservaCta(market), "lime");
  const { html: footHtml, text: footText } = pieFooter(market, data.negocio);
  const { html, text } = renderLayout({
    market,
    preheader,
    bodyHtml,
    bodyText: cuerpoFull,
    footerHtml: footHtml,
    footerText: footText,
  });
  return { subject: asunto, preheader, html, text };
}

export type SolicitudVencidaData = {
  /** WP-64 (D-044): kunden har betalat online och får pengarna tillbaka. */
  readonly reembolso?: boolean;
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
  const cuerpoFull = withReembolso(market, cuerpo, data.reembolso);
  const bodyHtml =
    textToHtmlParagraphs(cuerpoFull) +
    button(data.linkNuevaReserva, nuevaReservaCta(market), "lime");
  const { html: footHtml, text: footText } = pieFooter(market, data.negocio);
  const { html, text } = renderLayout({
    market,
    preheader,
    bodyHtml,
    bodyText: cuerpoFull,
    footerHtml: footHtml,
    footerText: footText,
  });
  return { subject: asunto, preheader, html, text };
}

// ---------------------------------------------------------------------------
// WP-56: avbokning med godkännande — företaget nekade kundens avbokning.
// ---------------------------------------------------------------------------

export type CancelacionRechazadaData = {
  readonly cliente: string;
  readonly negocio: string;
  readonly fecha: string;
  readonly hora: string;
  /** Företagets telefon, redan formaterad (`formatPhone`). Saknas den
   * hänvisar texten bara till företaget. */
  readonly telefono?: string;
};

/** Al cliente, cuando el negocio no acepta su cancelación: la hora sigue
 * reservada. Solo texto (sin botón: no hay nada que hacer en línea). */
export function cancelacionRechazadaEmail(
  market: Market,
  data: CancelacionRechazadaData,
): RenderedEmail {
  const ns = emailNs(market).cancelacionRechazada;
  const asunto = ns.asunto({ negocio: data.negocio });
  const preheader = ns.preheader(data);
  const cuerpo = ns.cuerpo(data);
  const { html: footHtml, text: footText } = pieFooter(market, data.negocio);
  const { html, text } = renderLayout({
    market,
    preheader,
    bodyHtml: textToHtmlParagraphs(cuerpo),
    bodyText: cuerpo,
    footerHtml: footHtml,
    footerText: footText,
  });
  return { subject: asunto, preheader, html, text };
}
