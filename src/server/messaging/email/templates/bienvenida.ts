import "server-only";

import { brand } from "@/config/brand";

import { emailNs } from "../content";
import { composeSimpleEmail } from "../layout";
import type { RenderedEmail } from "../types";

export type BienvenidaData = {
  readonly negocio: string;
  /** `/app` (o la ruta que corresponda) — dónde cae el dueño al aceptar. */
  readonly agendaUrl: string;
};

/** Al dueño, apenas termina el onboarding (F1). */
export function bienvenidaEmail(data: BienvenidaData): RenderedEmail {
  const ns = emailNs().bienvenida;
  const comun = emailNs().comun;
  return composeSimpleEmail({
    subject: ns.asunto({ marca: brand.name }),
    preheader: ns.preheader,
    titulo: ns.titulo,
    paragraphs: [ns.texto],
    steps: [ns.pasos.link, ns.pasos.compartir, ns.pasos.recordatorios],
    cta: { label: ns.cta, href: data.agendaUrl },
    footerLines: [
      comun.piePagina({ marca: brand.name, negocio: data.negocio }),
    ],
  });
}
