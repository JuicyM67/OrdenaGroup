import "server-only";

import { brand, type Market } from "@/config/brand";

import { emailNs } from "../content";
import { composeSimpleEmail } from "../layout";
import type { RenderedEmail } from "../types";

export type ValeCompradoData = {
  readonly negocio: string;
  readonly titulo: string;
  readonly codigo: string;
  /** Redan formaterat i köpets valuta. */
  readonly valor: string;
  /** Redan formaterat i företagets tidszon. */
  readonly validoHasta: string;
  readonly direccion: string | null;
  /** `/[slug]?vardebevis=<id>` (absolut). */
  readonly reservarUrl: string;
};

/** WP-69 (D-057): kvitto till köparen — kod, värde, giltighet, säljare och
 * ångerrätt (14 dagar), knapp "Välj tid". Pengarna har gått till företaget. */
export function valeCompradoEmail(
  market: Market,
  data: ValeCompradoData,
): RenderedEmail {
  const ns = emailNs(market).valeComprado;
  const comun = emailNs(market).comun;
  return composeSimpleEmail({
    market,
    subject: ns.asunto({ titulo: data.titulo }),
    preheader: ns.preheader({ negocio: data.negocio }),
    titulo: ns.titulo,
    paragraphs: [ns.texto({ negocio: data.negocio }), ns.arrepentimiento],
    cardRows: [
      { label: ns.codigo, value: data.codigo },
      { label: ns.servicio, value: data.titulo },
      { label: ns.valor, value: data.valor },
      { label: ns.validoHasta, value: data.validoHasta },
      {
        label: ns.vendidoPor,
        value: data.direccion
          ? `${data.negocio} · ${data.direccion}`
          : data.negocio,
      },
    ],
    cta: { label: ns.cta, href: data.reservarUrl },
    footerLines: [
      comun.piePagina({ marca: brand.name, negocio: data.negocio }),
    ],
  });
}
