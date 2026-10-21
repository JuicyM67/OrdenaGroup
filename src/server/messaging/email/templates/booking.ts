import "server-only";

import { brand } from "@/config/brand";
import * as Es from "@/i18n/es-CL";

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

function reservaConfirmacionTitulo(): string {
  return Es.reserva.confirmacion.titulo;
}

/** WP-54: "Precio socio: $16.200 (−$1.800)" för textversionen (kortet finns
 * bara i HTML). `null` utan medlemsrabatt. */
function precioSocioLine(data: BookingCardData): string | null {
  if (!data.precio || !data.descuentoSocio) return null;
  const miembro = emailNs().miembro;
  const label = data.descuentoOferta
    ? miembro.precioOfertaLabel
    : miembro.precioLabel;
  return `${label}: ${miembro.precio({
    precio: data.precio,
    descuento: data.descuentoSocio,
  })}`;
}

function cardRows(data: BookingCardData): BookingCardRow[] {
  const campos = gestionCampos();
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
    const miembro = emailNs().miembro;
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
    rows.push({ label: precioLabel(), value: data.precio });
  }
  return rows;
}

/** CTA-text för bokningsmejlen ("Ver mi reserva"): den nya
 * `email.comun`-satsen (copywriter-es-cl), inte `reserva.confirmacion.
 * verMiReserva` (samma ord, men tänkt för själva Reserva-sidan). */
function verMiReserva(): string {
  return emailNs().comun.verReserva;
}

function pieFooter(negocio: string): { html: string; text: string } {
  const pie = emailNs().pie({ negocio, plataforma: brand.name });
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
  data: ReservaConfirmadaData,
): RenderedEmail {
  const ns = emailNs().reservaConfirmada;
  const asunto = ns.asunto({ negocio: data.negocio });
  const preheader = ns.preheader(data);
  const cuerpo = ns.cuerpo(data);
  const titulo = reservaConfirmacionTitulo();
  const abonoLine = data.abono
    ? emailNs().abono.lineaConfirmacion(data.abono)
    : null;
  const bodyHtml =
    heading(titulo) +
    bookingCard(cardRows(data)) +
    (abonoLine ? textToHtmlParagraphs(abonoLine) : "") +
    button(data.linkGestion, verMiReserva());
  const { html: footHtml, text: footText } = pieFooter(data.negocio);
  const { html, text } = renderLayout({
    preheader,
    bodyHtml,
    bodyText: [titulo, cuerpo, precioSocioLine(data)]
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

export function recordatorioEmail(data: RecordatorioData): RenderedEmail {
  const ns = emailNs().recordatorio24h;
  const asunto = ns.asunto({ negocio: data.negocio, fecha: data.fecha });
  const preheader = ns.preheader(data);
  const cuerpo = ns.cuerpo(data);
  const bodyHtml =
    bookingCard(cardRows(data)) + button(data.linkGestion, verMiReserva());
  const { html: footHtml, text: footText } = pieFooter(data.negocio);
  const { html, text } = renderLayout({
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

export function reservaMovidaEmail(data: ReservaMovidaData): RenderedEmail {
  const ns = emailNs().reservaMovida;
  const asunto = ns.asunto({ negocio: data.negocio });
  const preheader = ns.preheader(data);
  const cuerpo = ns.cuerpo(data);
  const bodyHtml =
    bookingCard(cardRows(data)) + button(data.linkGestion, verMiReserva());
  const { html: footHtml, text: footText } = pieFooter(data.negocio);
  const { html, text } = renderLayout({
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
  data: ReservaCanceladaData,
): RenderedEmail {
  const ns = emailNs().reservaCancelada;
  const asunto = ns.asunto({ negocio: data.negocio });
  const preheader = ns.preheader(data);
  const cuerpo = ns.cuerpo(data);
  const bodyHtml =
    textToHtmlParagraphs(cuerpo) +
    button(data.linkNuevaReserva, nuevaReservaCta(), "lime");
  const { html: footHtml, text: footText } = pieFooter(data.negocio);
  const { html, text } = renderLayout({
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
  data: SolicitudRecibidaData,
): RenderedEmail {
  const ns = emailNs().solicitudRecibida;
  const asunto = ns.asunto({ negocio: data.negocio });
  const preheader = ns.preheader(data);
  const cuerpo = ns.texto(data);
  const bodyHtml =
    heading(ns.titulo) +
    bookingCard(cardRows(data)) +
    button(data.linkGestion, ns.cta);
  const { html: footHtml, text: footText } = pieFooter(data.negocio);
  const { html, text } = renderLayout({
    preheader,
    bodyHtml,
    bodyText: [ns.titulo, cuerpo, precioSocioLine(data)]
      .filter((x): x is string => x !== null)
      .join("\n\n"),
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
   * (`solicitudes.rechazarDialog.motivoLabel`). Viaja `declineBooking` →
   * `BookingEvent["declined"].message` → `message_outbox.payload.motivo`
   * (worker.ts) → acá; nunca se guarda en `bookings`. */
  readonly motivo?: string;
};

/** Al cliente, cuando el negocio rechaza su solicitud. Mismo patrón que
 * `reservaCanceladaEmail` (cuerpo de texto plano + botón "reservar de
 * nuevo"), con su propio `email.solicitudRechazada`. */
export function solicitudRechazadaEmail(
  data: SolicitudRechazadaData,
): RenderedEmail {
  const ns = emailNs().solicitudRechazada;
  const asunto = ns.asunto({ negocio: data.negocio });
  const preheader = ns.preheader(data);
  const cuerpo = ns.cuerpo(data);
  const bodyHtml =
    textToHtmlParagraphs(cuerpo) +
    button(data.linkNuevaReserva, nuevaReservaCta(), "lime");
  const { html: footHtml, text: footText } = pieFooter(data.negocio);
  const { html, text } = renderLayout({
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
  data: SolicitudVencidaData,
): RenderedEmail {
  const ns = emailNs().solicitudVencida;
  const asunto = ns.asunto({ negocio: data.negocio });
  const preheader = ns.preheader(data);
  const cuerpo = ns.cuerpo(data);
  const bodyHtml =
    textToHtmlParagraphs(cuerpo) +
    button(data.linkNuevaReserva, nuevaReservaCta(), "lime");
  const { html: footHtml, text: footText } = pieFooter(data.negocio);
  const { html, text } = renderLayout({
    preheader,
    bodyHtml,
    bodyText: cuerpo,
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
  data: CancelacionRechazadaData,
): RenderedEmail {
  const ns = emailNs().cancelacionRechazada;
  const asunto = ns.asunto({ negocio: data.negocio });
  const preheader = ns.preheader(data);
  const cuerpo = ns.cuerpo(data);
  const { html: footHtml, text: footText } = pieFooter(data.negocio);
  const { html, text } = renderLayout({
    preheader,
    bodyHtml: textToHtmlParagraphs(cuerpo),
    bodyText: cuerpo,
    footerHtml: footHtml,
    footerText: footText,
  });
  return { subject: asunto, preheader, html, text };
}
