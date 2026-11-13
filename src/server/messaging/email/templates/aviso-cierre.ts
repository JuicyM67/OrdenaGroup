import "server-only";

import { brand } from "@/config/brand";

import { emailNs } from "../content";
import { composeSimpleEmail } from "../layout";
import type { RenderedEmail } from "../types";

export type AvisoCierreData = {
  readonly negocio: string;
  /** Fecha de cierre ya formateada ("15 de febrero de 2027"). */
  readonly fecha: string;
  /** `${APP_URL}/app/ajustes/privacidad`. */
  readonly exportarUrl: string;
};

/** WP-91 (D-077): aviso al dueño de que la plataforma dejará de funcionar
 * (Términos: al menos 90 días antes), para que descargue sus datos. */
export function avisoCierreEmail(data: AvisoCierreData): RenderedEmail {
  const ns = emailNs().avisoCierre;
  return composeSimpleEmail({
    subject: ns.asunto({ marca: brand.name }),
    preheader: ns.preheader,
    titulo: ns.titulo,
    paragraphs: [
      ns.texto({ marca: brand.name, negocio: data.negocio, fecha: data.fecha }),
      ns.exportar,
      ns.fichas,
    ],
    cta: { label: ns.cta, href: data.exportarUrl },
    footerLines: [],
  });
}
