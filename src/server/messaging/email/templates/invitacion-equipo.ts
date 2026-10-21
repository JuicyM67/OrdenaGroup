import "server-only";

import { emailNs } from "../content";
import { button, caption, heading, paragraph, renderLayout } from "../layout";
import type { RenderedEmail } from "../types";

/**
 * Al profesional invitado (WP-46, D-034): único canal de invitación en v1
 * (el plan de WP-46 §4 descarta SMS/WhatsApp para esto). Mismo armado
 * manual que `acceso.ts` (heading + paragraph + botón + captions) en vez de
 * `composeSimpleEmail` — esa función no deja un `expira`/`ignorar` aparte
 * del cuerpo, que es justo lo que pide `email.invitacionEquipo`
 * (`src/i18n/es-CL.ts`). El enlace (`acceptUrl`) apunta a
 * `${APP_URL}/app/invitacion/${token}` (WP-46 plan, paso 4) — construido
 * por quien llama (el worker, `outbox/worker.ts`), no acá.
 */
export type InvitacionEquipoData = {
  readonly negocio: string;
  /** Nombre/visualización del dueño que envía la invitación. */
  readonly invitadoPor: string;
  readonly acceptUrl: string;
};

export function invitacionEquipoEmail(
  data: InvitacionEquipoData,
): RenderedEmail {
  const ns = emailNs().invitacionEquipo;
  const asunto = ns.asunto({ negocio: data.negocio });
  const preheader = ns.preheader({
    invitadoPor: data.invitadoPor,
    negocio: data.negocio,
  });
  const texto = ns.texto({
    negocio: data.negocio,
    invitadoPor: data.invitadoPor,
  });

  const bodyHtml =
    heading(ns.titulo) +
    paragraph(texto) +
    button(data.acceptUrl, ns.cta, "lime") +
    caption(ns.expira) +
    caption(ns.ignorar);

  const bodyText = [
    ns.titulo,
    texto,
    data.acceptUrl,
    ns.expira,
    ns.ignorar,
  ].join("\n\n");

  const { html, text } = renderLayout({
    preheader,
    bodyHtml,
    bodyText,
    footerHtml: "",
    footerText: "",
  });
  return { subject: asunto, preheader, html, text };
}
