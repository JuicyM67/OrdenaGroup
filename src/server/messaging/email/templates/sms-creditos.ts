import "server-only";

import { brand, type Market } from "@/config/brand";

import { emailNs } from "../content";
import { composeSimpleEmail } from "../layout";
import type { RenderedEmail } from "../types";

export type SmsAvisoData = {
  readonly negocio: string;
  readonly usado: number;
  readonly max: number;
  /** Inställningar → Plan (absolut länk). */
  readonly planUrl: string;
};

/** WP-76 (D-053): till ägaren, 80 % av månadens sms i planen är använda. */
export function smsCuota80Email(
  market: Market,
  data: SmsAvisoData,
): RenderedEmail {
  const ns = emailNs(market).smsCuota80;
  const comun = emailNs(market).comun;
  return composeSimpleEmail({
    market,
    subject: ns.asunto,
    preheader: ns.preheader,
    titulo: ns.titulo,
    paragraphs: [ns.texto({ usado: data.usado, max: data.max }), ns.ayuda],
    cta: { label: ns.cta, href: data.planUrl },
    footerLines: [
      comun.piePagina({ marca: brand.name, negocio: data.negocio }),
    ],
  });
}

/** WP-76 (D-053): till ägaren, kvot och krediter är slut (sms → e-post). */
export function smsAgotadosEmail(
  market: Market,
  data: SmsAvisoData,
): RenderedEmail {
  const ns = emailNs(market).smsAgotados;
  const comun = emailNs(market).comun;
  return composeSimpleEmail({
    market,
    subject: ns.asunto,
    preheader: ns.preheader,
    titulo: ns.titulo,
    paragraphs: [ns.texto({ usado: data.usado, max: data.max }), ns.ayuda],
    cta: { label: ns.cta, href: data.planUrl },
    footerLines: [
      comun.piePagina({ marca: brand.name, negocio: data.negocio }),
    ],
  });
}
