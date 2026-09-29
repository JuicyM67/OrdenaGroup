import "server-only";

import { brand, type Market } from "@/config/brand";

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
};

function cardRows(market: Market, data: DuenoReservaData) {
  const campos = gestionCampos(market);
  return [
    { label: campos.servicio, value: data.servicio },
    { label: campos.dia, value: data.fecha },
    { label: campos.hora, value: data.hora },
  ];
}

/** Al dueño, cuando un cliente reserva por su cuenta desde `/[slug]`. */
export function nuevaReservaDuenoEmail(
  market: Market,
  data: DuenoReservaData,
): RenderedEmail {
  const ns = emailNs(market).nuevaReservaDueno;
  const comun = emailNs(market).comun;
  return composeSimpleEmail({
    market,
    subject: ns.asunto({ cliente: data.cliente, fecha: data.fecha }),
    preheader: ns.preheader({ servicio: data.servicio, hora: data.hora }),
    titulo: ns.titulo,
    paragraphs: [ns.texto(data)],
    cardRows: cardRows(market, data),
    cta: { label: ns.cta, href: data.agendaUrl },
    footerLines: [
      comun.piePagina({ marca: brand.name, negocio: data.negocio }),
    ],
  });
}

/** Al dueño, cuando un cliente cancela su propia reserva desde `r/[token]`
 * o por WhatsApp/SMS. Misma forma que `nuevaReservaDueno`. */
export function cancelacionDuenoEmail(
  market: Market,
  data: DuenoReservaData,
): RenderedEmail {
  const ns = emailNs(market).cancelacionDueno;
  const comun = emailNs(market).comun;
  return composeSimpleEmail({
    market,
    subject: ns.asunto({ cliente: data.cliente, fecha: data.fecha }),
    preheader: ns.preheader({ servicio: data.servicio, hora: data.hora }),
    titulo: ns.titulo,
    paragraphs: [ns.texto(data)],
    cardRows: cardRows(market, data),
    cta: { label: ns.cta, href: data.agendaUrl },
    footerLines: [
      comun.piePagina({ marca: brand.name, negocio: data.negocio }),
    ],
  });
}
