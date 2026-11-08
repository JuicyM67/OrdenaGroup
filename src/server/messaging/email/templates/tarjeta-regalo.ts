import "server-only";

import { brand } from "@/config/brand";
import { regalo } from "@/i18n";

import { emailColors as c } from "../colors";
import { emailNs } from "../content";
import {
  bookingCard,
  button,
  escapeHtml,
  FONT_DISPLAY,
  FONT_SANS,
  footerHtml,
  heading,
  renderLayout,
  secondaryLink,
  textToHtmlParagraphs,
} from "../layout";
import type { RenderedEmail } from "../types";

/**
 * WP-87 (D-073, port av SE:s presentkortsmejl D-058): tarjetans två mejl.
 * `tarjetaRegaloComprador` till köparen (komprobant, kod, länk till kortet)
 * och `tarjetaRegaloDestinatario` till mottagaren (kortet i vald färg,
 * hälsningen, koden, "Reservar hora", saldolänken). Adresserna slås upp vid
 * sändningen (workern); hälsningen är fri text och escapas alltid.
 */

export type TarjetaRegaloTema = "lime" | "lilac";

export type TarjetaRegaloCompradorData = {
  readonly negocio: string;
  readonly valor: string;
  readonly codigo: string;
  /** Mottagarens namn, om det angavs. */
  readonly para: string | null;
  readonly validoHasta: string;
  readonly direccion: string | null;
  /** Köparens länk (visa/skriv ut), absolut. */
  readonly verUrl: string;
};

export function tarjetaRegaloCompradorEmail(
  data: TarjetaRegaloCompradorData,
): RenderedEmail {
  const ns = regalo.email.comprador;
  const comun = emailNs().comun;
  const texto = data.para
    ? ns.textoPara({ negocio: data.negocio, nombre: data.para })
    : ns.texto({ negocio: data.negocio });
  const rows = [
    { label: ns.valor, value: data.valor },
    { label: ns.codigo, value: data.codigo },
    ...(data.para ? [{ label: ns.para, value: data.para }] : []),
    { label: ns.validoHasta, value: data.validoHasta },
    {
      label: ns.vendidoPor,
      value: data.direccion
        ? `${data.negocio} · ${data.direccion}`
        : data.negocio,
    },
  ];
  const footer = [
    comun.piePagina({ marca: brand.name, negocio: data.negocio }),
  ];
  const bodyHtml =
    heading(ns.titulo) +
    textToHtmlParagraphs(texto) +
    bookingCard(rows) +
    textToHtmlParagraphs(ns.nota) +
    button(data.verUrl, ns.cta);
  const bodyText = [
    ns.titulo,
    texto,
    ...rows.map((r) => `${r.label}: ${r.value}`),
    ns.nota,
    `${ns.cta}: ${data.verUrl}`,
  ].join("\n\n");
  const { html, text } = renderLayout({
    preheader: ns.preheader({ negocio: data.negocio }),
    bodyHtml,
    bodyText,
    footerHtml: footerHtml(footer),
    footerText: footer.join("\n"),
  });
  return {
    subject: ns.asunto({ negocio: data.negocio }),
    preheader: ns.preheader({ negocio: data.negocio }),
    html,
    text,
  };
}

export type TarjetaRegaloDestinatarioData = {
  /** Mottagarens namn (kan saknas). */
  readonly nombre: string | null;
  /** Köparens namn (kan saknas). */
  readonly de: string | null;
  readonly negocio: string;
  readonly valor: string;
  readonly validoHasta: string;
  readonly codigo: string;
  readonly saludo: string | null;
  readonly tema: TarjetaRegaloTema;
  readonly reservarUrl: string;
  readonly verUrl: string;
  readonly direccion: string | null;
};

/** Kortet i vald färg. Explicita färger på cellen (se `layout.ts` om mörkt
 * läge); inga externa bilder i mejlen. */
function giftCardBlock(
  tema: TarjetaRegaloTema,
  negocio: string,
  etiqueta: string,
  valor: string,
  validoHasta: string,
): string {
  const bg = tema === "lime" ? c.lime : c.lilac;
  const fg = c.ink;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${bg}" style="background-color:${bg};border-radius:22px;margin:0 0 22px;">
      <tr>
        <td bgcolor="${bg}" style="background-color:${bg};border-radius:22px 0 0 0;padding:26px 0 0 26px;font-family:${FONT_DISPLAY};font-size:18px;font-weight:800;color:${fg};">${escapeHtml(negocio)}</td>
        <td bgcolor="${bg}" align="right" style="background-color:${bg};border-radius:0 22px 0 0;padding:26px 26px 0 0;font-family:${FONT_SANS};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${fg};">${escapeHtml(etiqueta)}</td>
      </tr>
      <tr>
        <td colspan="2" bgcolor="${bg}" style="background-color:${bg};padding:40px 26px 12px;font-family:${FONT_DISPLAY};font-size:56px;font-weight:800;letter-spacing:-0.03em;line-height:1;color:${fg};">${escapeHtml(valor)}</td>
      </tr>
      <tr>
        <td colspan="2" bgcolor="${bg}" style="background-color:${bg};border-radius:0 0 22px 22px;padding:0 26px 26px;font-family:${FONT_SANS};font-size:12px;color:${fg};">${escapeHtml(validoHasta)}</td>
      </tr>
    </table>`;
}

function greetingBlock(text: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px;">
      <tr>
        <td bgcolor="${c.canvas}" style="background-color:${c.canvas};border-radius:16px;padding:16px 18px;font-family:${FONT_SANS};font-size:16px;line-height:1.6;font-style:italic;color:${c.ink};">“${escapeHtml(text).replace(/\n/g, "<br />")}”</td>
      </tr>
    </table>`;
}

function codeBlock(label: string, code: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;">
      <tr>
        <td style="padding:0 0 6px;font-family:${FONT_SANS};font-size:13px;color:${c.muted};">${escapeHtml(label)}</td>
      </tr>
      <tr>
        <td bgcolor="${c.surface}" style="background-color:${c.surface};border:2px dashed ${c.border};border-radius:14px;padding:12px 16px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:24px;font-weight:700;letter-spacing:0.08em;color:${c.ink};">${escapeHtml(code)}</td>
      </tr>
    </table>`;
}

export function tarjetaRegaloDestinatarioEmail(
  data: TarjetaRegaloDestinatarioData,
): RenderedEmail {
  const ns = regalo.email.destinatario;
  const comun = emailNs().comun;
  const titulo =
    data.nombre && data.de
      ? ns.tituloDe({ nombre: data.nombre, de: data.de })
      : data.nombre
        ? ns.titulo({ nombre: data.nombre })
        : ns.tituloSinNombre;
  const asunto = data.de
    ? ns.asuntoDe({ de: data.de, negocio: data.negocio })
    : ns.asunto({ negocio: data.negocio });
  const valido = ns.validoHasta({ fecha: data.validoHasta });
  const ayuda = ns.ayuda({ negocio: data.negocio });
  const footer = [
    ...(data.direccion ? [`${data.negocio} · ${data.direccion}`] : []),
    comun.piePagina({ marca: brand.name, negocio: data.negocio }),
  ];
  const bodyHtml =
    heading(titulo) +
    giftCardBlock(data.tema, data.negocio, ns.etiqueta, data.valor, valido) +
    (data.saludo ? greetingBlock(data.saludo) : "") +
    codeBlock(ns.codigo, data.codigo) +
    button(data.reservarUrl, ns.cta) +
    textToHtmlParagraphs(ayuda) +
    secondaryLink(data.verUrl, ns.saldo);
  const bodyText = [
    titulo,
    `${data.negocio} · ${ns.etiqueta} · ${data.valor}`,
    valido,
    ...(data.saludo ? [`“${data.saludo}”`] : []),
    `${ns.codigo}: ${data.codigo}`,
    `${ns.cta}: ${data.reservarUrl}`,
    ayuda,
    `${ns.saldo}: ${data.verUrl}`,
  ].join("\n\n");
  const { html, text } = renderLayout({
    preheader: ns.preheader({ negocio: data.negocio }),
    bodyHtml,
    bodyText,
    footerHtml: footerHtml(footer),
    footerText: footer.join("\n"),
  });
  return {
    subject: asunto,
    preheader: ns.preheader({ negocio: data.negocio }),
    html,
    text,
  };
}
