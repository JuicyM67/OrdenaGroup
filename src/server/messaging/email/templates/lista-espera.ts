import "server-only";

import { brand, type Market } from "@/config/brand";

import { emailNs, gestionCampos } from "../content";
import { composeSimpleEmail } from "../layout";
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
