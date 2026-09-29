import "server-only";

import { brand, type Market } from "@/config/brand";

import { emailNs } from "../content";
import {
  button,
  caption,
  codeLine,
  heading,
  paragraph,
  renderLayout,
} from "../layout";
import type { RenderedEmail } from "../types";

/**
 * Åtkomstmejlen (Supabase Auth, D-019): länken MÅSTE peka mot
 * `/auth/confirm?token_hash=…&type=…` (se `src/app/auth/confirm/route.ts`),
 * aldrig Supabases egen `{{ .ConfirmationURL }}` (PKCE) — den länken bara
 * funkar i samma webbläsare som bad om den, vilket bryter när länken öppnas
 * i WhatsApps interna webbläsare (se `acceso.errores.pkce_mismatch`).
 * `confirmUrl` byggs av anroparen: `scripts/render-auth-templates.ts`
 * skickar in de bokstavliga Supabase-variablerna
 * (`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…`) så att
 * de hamnar oförändrade i den statiska mallen; testerna/design lab skickar
 * in en exempel-URL och en exempelkod.
 */
export type AccesoEmailData = {
  readonly confirmUrl: string;
  /** `{{ .Token }}` — reservkoden när länken inte fungerar. */
  readonly token: string;
};

type AccesoNs = {
  readonly asunto: (p: { marca: string }) => string;
  readonly preheader: string;
  readonly titulo: string;
  readonly texto: string;
  readonly cta: string;
  readonly codigo: string;
  readonly ignorar: string;
  readonly expira: string;
};

function render(
  market: Market,
  data: AccesoEmailData,
  ns: AccesoNs,
): RenderedEmail {
  const asunto = ns.asunto({ marca: brand.name });
  const bodyHtml =
    heading(ns.titulo) +
    paragraph(ns.texto) +
    button(data.confirmUrl, ns.cta) +
    codeLine(ns.codigo, data.token) +
    caption(ns.expira) +
    caption(ns.ignorar);

  const bodyText = [
    ns.titulo,
    ns.texto,
    data.confirmUrl,
    `${ns.codigo} ${data.token}`,
    ns.expira,
    ns.ignorar,
  ].join("\n\n");

  const { html, text } = renderLayout({
    market,
    preheader: ns.preheader,
    bodyHtml,
    bodyText,
    footerHtml: "",
    footerText: "",
  });
  return { subject: asunto, preheader: ns.preheader, html, text };
}

export function magicLinkEmail(
  market: Market,
  data: AccesoEmailData,
): RenderedEmail {
  return render(market, data, emailNs(market).acceso.magicLink);
}

export function confirmationEmail(
  market: Market,
  data: AccesoEmailData,
): RenderedEmail {
  return render(market, data, emailNs(market).acceso.confirmation);
}
