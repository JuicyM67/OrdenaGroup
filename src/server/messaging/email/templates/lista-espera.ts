import "server-only";

import { brand, type Market } from "@/config/brand";

import { emailNs, gestionCampos } from "../content";
import {
  composeSimpleEmail,
  footerHtml,
  renderLayout,
  textToHtmlParagraphs,
} from "../layout";
import type { RenderedEmail } from "../types";

export type ListaEsperaCupoData = {
  readonly negocio: string;
  readonly servicio: string;
  readonly fecha: string;
  readonly hora: string;
  readonly minutos: number;
  /** Link de confirmación de la oferta (respaldo por correo del WhatsApp
   * `lista_espera_oferta`, INTEGRATIONS.md §1). */
  readonly confirmarUrl: string;
};

/** Al cliente en lista de espera, cuando se libera un cupo. */
export function listaEsperaCupoEmail(
  market: Market,
  data: ListaEsperaCupoData,
): RenderedEmail {
  const ns = emailNs(market).listaEsperaCupo;
  const comun = emailNs(market).comun;
  const campos = gestionCampos(market);
  return composeSimpleEmail({
    market,
    subject: ns.asunto({ negocio: data.negocio }),
    preheader: ns.preheader({ servicio: data.servicio, fecha: data.fecha }),
    titulo: ns.titulo,
    paragraphs: [
      ns.texto({ servicio: data.servicio, fecha: data.fecha }),
      ns.expira({ minutos: data.minutos }),
    ],
    cardRows: [
      { label: campos.servicio, value: data.servicio },
      { label: campos.dia, value: data.fecha },
      { label: campos.hora, value: data.hora },
    ],
    cta: { label: ns.cta, href: data.confirmarUrl },
    footerLines: [
      comun.piePagina({ marca: brand.name, negocio: data.negocio }),
      comun.porQueRecibes,
    ],
  });
}

export type ListaEsperaTomadaData = {
  readonly cliente: string;
  readonly negocio: string;
  readonly fecha: string;
};

/** Al cliente en lista de espera, cuando la hora que se le ofreció (por
 * `listaEsperaCupoEmail`/`lista_espera_oferta`) ya fue tomada por otra
 * persona. Solo texto (sin botón: no hay nada que hacer en línea, sigue
 * esperando) — mismo patrón que `cancelacionRechazadaEmail`. */
export function listaEsperaTomadaEmail(
  market: Market,
  data: ListaEsperaTomadaData,
): RenderedEmail {
  const ns = emailNs(market).listaEsperaTomada;
  const comun = emailNs(market).comun;
  const asunto = ns.asunto({ negocio: data.negocio });
  const preheader = ns.preheader({ fecha: data.fecha });
  const cuerpo = ns.cuerpo(data);
  const pie = comun.piePagina({ marca: brand.name, negocio: data.negocio });
  const { html, text } = renderLayout({
    market,
    preheader,
    bodyHtml: textToHtmlParagraphs(cuerpo),
    bodyText: cuerpo,
    footerHtml: footerHtml([pie]),
    footerText: pie,
  });
  return { subject: asunto, preheader, html, text };
}
