import "server-only";

import { brand } from "@/config/brand";

import { emailNs } from "../content";
import { composeSimpleEmail } from "../layout";
import type { RenderedEmail } from "../types";

export type SolicitudResenaData = {
  readonly cliente: string;
  readonly negocio: string;
  readonly servicio: string;
  /** `/resena/<token>` (SE `/recension/<token>`). */
  readonly resenaUrl: string;
};

/** WP-65 (D-045): al cliente, 2 h después de una cita realizada. */
export function solicitudResenaEmail(data: SolicitudResenaData): RenderedEmail {
  const ns = emailNs().solicitudResena;
  const comun = emailNs().comun;
  return composeSimpleEmail({
    subject: ns.asunto({ negocio: data.negocio }),
    preheader: ns.preheader,
    titulo: ns.titulo,
    paragraphs: [
      ns.texto({
        cliente: data.cliente,
        negocio: data.negocio,
        servicio: data.servicio,
      }),
      ns.ayuda,
    ],
    cta: { label: ns.cta, href: data.resenaUrl },
    footerLines: [
      comun.piePagina({ marca: brand.name, negocio: data.negocio }),
    ],
  });
}
