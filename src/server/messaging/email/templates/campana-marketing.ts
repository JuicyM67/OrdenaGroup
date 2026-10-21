import "server-only";

import { brand } from "@/config/brand";

import { emailNs } from "../content";
import {
  bookingCard,
  button,
  footerHtml,
  heading,
  renderLayout,
  secondaryLink,
  textToHtmlParagraphs,
  type BookingCardRow,
} from "../layout";
import type { RenderedEmail } from "../types";

export type CampanaMarketingData = {
  readonly negocio: string;
  /** Meddelandet ägaren skrev (fri text, ≤ 1000 tecken — validerat av
   * `campaignInputSchema`/`campaigns_message_length_check`). */
  readonly texto: string;
  /** Utelämnas om kampanjen inte har ett erbjudande. */
  readonly offerPct?: number;
  readonly offerText?: string;
  /** Redan formaterat ("28 de septiembre"), inte "YYYY-MM-DD" — anroparen
   * (`worker.ts`) formaterar med `formatLocalDate` (samma mönster som
   * `fecha`/`hora` i övriga mallar, WP-03). */
  readonly offerValidUntil?: string;
  /** `${APP_URL}/${slug}?o=${token}` — alltid satt (ett erbjudande eller
   * inte, samma token används för spårning av "Reservar"-klick). */
  readonly reservarUrl: string;
  /** `${APP_URL}/baja/${token}` — alltid med, aldrig valfritt (regel hård 7,
   * ingen marknadsföring utan en avregistreringslänk). */
  readonly bajaUrl: string;
};

/**
 * Kampanjmejlet (`/app/clientes/utskick`, WP-31/F14): fri text + en valfri
 * lime-ruta med erbjudandet. Bygger inte på `composeSimpleEmail` (de andra
 * HTML-mejlen) eftersom den inte stöder en klickbar fotlänk — här måste
 * avregistreringslänken vara en riktig `<a>` (regel hård 7), inte bara en
 * textrad (`footerHtml`).
 */
export function campanaMarketingEmail(
  data: CampanaMarketingData,
): RenderedEmail {
  const ns = emailNs().campanaMarketing;
  const comun = emailNs().comun;

  const ofertaRows: BookingCardRow[] =
    data.offerPct === undefined
      ? []
      : [
          {
            label: ns.ofertaLabel,
            value: ns.oferta({
              pct: data.offerPct,
              fecha: data.offerValidUntil,
            }),
          },
          ...(data.offerText
            ? [{ label: ns.ofertaTextoLabel, value: data.offerText }]
            : []),
        ];

  const titulo = ns.titulo({ negocio: data.negocio });
  const bodyHtml =
    heading(titulo) +
    textToHtmlParagraphs(data.texto) +
    (ofertaRows.length > 0 ? bookingCard(ofertaRows) : "") +
    button(data.reservarUrl, ns.cta, "lime");

  const bodyText = [
    titulo,
    data.texto,
    ...ofertaRows.map((r) => `${r.label}: ${r.value}`),
  ].join("\n\n");

  const footerLines = [
    comun.piePagina({ marca: brand.name, negocio: data.negocio }),
    ns.porQue({ negocio: data.negocio }),
  ];

  const { html, text } = renderLayout({
    preheader: ns.preheader,
    bodyHtml,
    bodyText,
    footerHtml: footerHtml(footerLines) + secondaryLink(data.bajaUrl, ns.baja),
    footerText: [...footerLines, `${ns.baja}: ${data.bajaUrl}`].join("\n"),
  });

  return {
    subject: ns.asunto({ negocio: data.negocio }),
    preheader: ns.preheader,
    html,
    text,
  };
}
