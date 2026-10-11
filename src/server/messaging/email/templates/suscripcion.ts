import "server-only";

import { brand, type Market } from "@/config/brand";
import { suscripcion as Es } from "@/i18n/es-CL.suscripcion";
import { suscripcion as Sv } from "@/i18n/sv-SE.suscripcion";

import { emailNs } from "../content";
import { composeSimpleEmail } from "../layout";
import type { RenderedEmail } from "../types";

/** WP-78 (D-059): mejl till ägaren om abonnemanget. Bara siffror, planens
 * namn och datum — ingen kunddata. Texterna i `src/i18n/*.suscripcion.ts`. */
function ns(market: Market) {
  return (market === "SE" ? Sv : Es).email;
}

export type SuscripcionFallidaData = {
  readonly negocio: string;
  readonly plan: string;
  /** Formaterat datum för grace-slutet. */
  readonly fecha: string;
  /** Plan-fliken (absolut länk). */
  readonly planUrl: string;
  /** Kortet kräver bekräftelse: fakturans sida i Stripe. */
  readonly facturaUrl?: string | null;
};

export type SuscripcionGratisData = {
  readonly negocio: string;
  readonly plan: string;
  readonly motivo: string;
  readonly planUrl: string;
};

export type SuscripcionPilotoData = {
  readonly negocio: string;
  readonly fecha: string;
  readonly dias: number;
  readonly planUrl: string;
};

function footer(market: Market, negocio: string): string[] {
  return [emailNs(market).comun.piePagina({ marca: brand.name, negocio })];
}

export function abonnemangBetalningMisslyckadesEmail(
  market: Market,
  data: SuscripcionFallidaData,
): RenderedEmail {
  const t = ns(market).abonnemangBetalningMisslyckades;
  return composeSimpleEmail({
    market,
    subject: t.asunto,
    preheader: t.preheader,
    titulo: t.titulo,
    paragraphs: [t.texto({ plan: data.plan, fecha: data.fecha }), t.ayuda],
    cta: data.facturaUrl
      ? { label: t.ctaFactura, href: data.facturaUrl }
      : { label: t.cta, href: data.planUrl },
    footerLines: footer(market, data.negocio),
  });
}

export function abonnemangNedgraderatEmail(
  market: Market,
  data: SuscripcionGratisData,
): RenderedEmail {
  const t = ns(market).abonnemangNedgraderat;
  return composeSimpleEmail({
    market,
    subject: t.asunto,
    preheader: t.preheader,
    titulo: t.titulo,
    paragraphs: [t.texto({ plan: data.plan, motivo: data.motivo }), t.ayuda],
    cta: { label: t.cta, href: data.planUrl },
    footerLines: footer(market, data.negocio),
  });
}

export function abonnemangPilotSlutarEmail(
  market: Market,
  data: SuscripcionPilotoData,
): RenderedEmail {
  const t = ns(market).abonnemangPilotSlutar;
  return composeSimpleEmail({
    market,
    subject: t.asunto({ dias: data.dias }),
    preheader: t.preheader,
    titulo: t.titulo,
    paragraphs: [t.texto({ fecha: data.fecha }), t.ayuda],
    cta: { label: t.cta, href: data.planUrl },
    footerLines: footer(market, data.negocio),
  });
}
