import "server-only";

import { brand } from "@/config/brand";

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
  data: InvitacionNegocioData,
): RenderedEmail {
  const ns = emailNs().invitacionNegocio;
  return composeSimpleEmail({
    subject: ns.asunto({ marca: brand.name }),
    preheader: ns.preheader,
    titulo: ns.titulo,
    paragraphs: [ns.texto({ negocio: data.negocio })],
    cta: { label: ns.cta, href: data.aceptarUrl },
    footerLines: [],
  });
}

export type InvitacionAdminData = {
  /** Magisk länk (`/auth/confirm?token_hash=…&type=magiclink`), WP-80. */
  readonly ingresarUrl: string;
  /** `${APP_URL}/admin` — där MFA aktiveras efter inloggningen. */
  readonly adminUrl: string;
};

/** WP-80 (D-061): en plattformsadmin lade till mottagaren som admin. */
export function invitacionAdminEmail(data: InvitacionAdminData): RenderedEmail {
  const ns = emailNs().invitacionAdmin;
  return composeSimpleEmail({
    subject: ns.asunto({ marca: brand.name }),
    preheader: ns.preheader,
    titulo: ns.titulo,
    paragraphs: [
      ns.texto({ marca: brand.name }),
      ns.mfa({ url: data.adminUrl }),
    ],
    cta: { label: ns.cta, href: data.ingresarUrl },
    footerLines: [],
  });
}
