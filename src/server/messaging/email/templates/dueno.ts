import "server-only";

import { brand } from "@/config/brand";

import { emailNs, gestionCampos } from "../content";
import { composeSimpleEmail } from "../layout";
import type { RenderedEmail } from "../types";

export type DuenoReservaData = {
  readonly negocio: string;
  readonly cliente: string;
  readonly servicio: string;
  readonly fecha: string;
  readonly hora: string;
  /** `/app/agenda` (o la ruta que corresponda). */
  readonly agendaUrl: string;
  /** WP-40 (D-031): respuestas de las preguntas de la reserva, ya
   * formateadas en texto plano (`label`/`value`). Solo en
   * `nuevaReservaDueno` — `cancelacionDueno` nunca las setea. El worker las
   * lee al enviar (D-029): nunca viven en `message_outbox.payload` ni en
   * los logs (Ley 21.719). */
  readonly answers?: readonly {
    readonly label: string;
    readonly value: string;
  }[];
};

function cardRows(data: DuenoReservaData) {
  const campos = gestionCampos();
  return [
    { label: campos.servicio, value: data.servicio },
    { label: campos.dia, value: data.fecha },
    { label: campos.hora, value: data.hora },
    ...(data.answers ?? []),
  ];
}

/** Al dueño, cuando un cliente reserva por su cuenta desde `/[slug]`. */
export function nuevaReservaDuenoEmail(data: DuenoReservaData): RenderedEmail {
  const ns = emailNs().nuevaReservaDueno;
  const comun = emailNs().comun;
  return composeSimpleEmail({
    subject: ns.asunto({ cliente: data.cliente, fecha: data.fecha }),
    preheader: ns.preheader({ servicio: data.servicio, hora: data.hora }),
    titulo: ns.titulo,
    paragraphs: [ns.texto(data)],
    cardRows: cardRows(data),
    cta: { label: ns.cta, href: data.agendaUrl },
    footerLines: [
      comun.piePagina({ marca: brand.name, negocio: data.negocio }),
    ],
  });
}

/** Al dueño, cuando una solicitud (`requested`, WP-45/D-033) queda
 * pendiente de confirmar: no se manda si `auto_confirm_bookings` está
 * prendido (ahí la reserva nace `confirmed` y usa `nuevaReservaDueno`).
 * Misma forma y mismas respuestas (`answers`) que `nuevaReservaDueno`. */
export function nuevaSolicitudEmail(data: DuenoReservaData): RenderedEmail {
  const ns = emailNs().nuevaSolicitud;
  const comun = emailNs().comun;
  return composeSimpleEmail({
    subject: ns.asunto({ cliente: data.cliente, fecha: data.fecha }),
    preheader: ns.preheader({ servicio: data.servicio, hora: data.hora }),
    titulo: ns.titulo,
    paragraphs: [ns.texto(data)],
    cardRows: cardRows(data),
    cta: { label: ns.cta, href: data.agendaUrl },
    footerLines: [
      comun.piePagina({ marca: brand.name, negocio: data.negocio }),
    ],
  });
}

/** Al dueño, cuando un cliente cancela su propia reserva desde `r/[token]`
 * o por WhatsApp/SMS. Misma forma que `nuevaReservaDueno`. */
export function cancelacionDuenoEmail(data: DuenoReservaData): RenderedEmail {
  const ns = emailNs().cancelacionDueno;
  const comun = emailNs().comun;
  return composeSimpleEmail({
    subject: ns.asunto({ cliente: data.cliente, fecha: data.fecha }),
    preheader: ns.preheader({ servicio: data.servicio, hora: data.hora }),
    titulo: ns.titulo,
    paragraphs: [ns.texto(data)],
    cardRows: cardRows(data),
    cta: { label: ns.cta, href: data.agendaUrl },
    footerLines: [
      comun.piePagina({ marca: brand.name, negocio: data.negocio }),
    ],
  });
}

/** WP-56: al dueño, cuando un cliente pide cancelar y el negocio exige
 * aprobación (`cancel_requested`). `agendaUrl` es acá el link a
 * `/app/solicitudes/{id}` (responder con un toque). Sin respuestas. */
export function solicitudCancelacionEmail(
  data: DuenoReservaData,
): RenderedEmail {
  const ns = emailNs().solicitudCancelacion;
  const comun = emailNs().comun;
  return composeSimpleEmail({
    subject: ns.asunto({ cliente: data.cliente, fecha: data.fecha }),
    preheader: ns.preheader({ servicio: data.servicio, hora: data.hora }),
    titulo: ns.titulo,
    paragraphs: [ns.texto(data)],
    cardRows: cardRows(data),
    cta: { label: ns.cta, href: data.agendaUrl },
    footerLines: [
      comun.piePagina({ marca: brand.name, negocio: data.negocio }),
    ],
  });
}
