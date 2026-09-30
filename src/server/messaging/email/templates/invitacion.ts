import "server-only";

import { brand, type Market } from "@/config/brand";

import { emailNs } from "../content";
import { composeSimpleEmail } from "../layout";
import type { RenderedEmail } from "../types";

export type InvitacionNegocioData = {
  readonly negocio: string;
  /** `${APP_URL}/app/bienvenida/${token}` (F19/WP-36). */
  readonly aceptarUrl: string;
};

/** Invitación a crear un negocio, enviada desde `/admin` (F19/WP-36). */
export function invitacionNegocioEmail(
  market: Market,
  data: InvitacionNegocioData,
): RenderedEmail {
  const ns = emailNs(market).invitacionNegocio;
  return composeSimpleEmail({
    market,
    subject: ns.asunto({ marca: brand.name }),
    preheader: ns.preheader,
    titulo: ns.titulo,
    paragraphs: [ns.texto({ negocio: data.negocio })],
    cta: { label: ns.cta, href: data.aceptarUrl },
    footerLines: [],
  });
}
