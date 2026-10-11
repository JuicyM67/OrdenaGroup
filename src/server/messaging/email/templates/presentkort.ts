import "server-only";

import { brand, type Market } from "@/config/brand";
import * as Es from "@/i18n/es-CL";
import * as Sv from "@/i18n/sv-SE.app";

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
 * WP-77 (D-058): presentkortets två mejl. `presentkortKvitto` till köparen
 * (kvitto, kod, flerfunktionsvoucher-raden, ångerrätt, länk till kortet) och
 * `presentkortLeverans` till mottagaren (designen `Mejl.dc.html`: kort i
 * vald färg, hälsningen, koden, "Boka tid", saldolänken). Adresserna slås upp
 * vid sändningen (workern); hälsningen är fri text och escapas alltid.
 */

function regaloNs(market: Market) {
  return market === "SE" ? Sv.regalo : Es.regalo;
}

export type PresentkortTheme = "lime" | "lilac" | "photo";

export type PresentkortKvittoData = {
  readonly negocio: string;
  readonly valor: string;
  readonly codigo: string;
  /** Mottagarens namn; `null` = köparen själv (ingen mottagaradress). */
  readonly para: string | null;
  /** "24 december 2026" (leveransdag) eller `null` = direkt. */
  readonly fechaEnvio: string | null;
  readonly validoHasta: string;
  readonly direccion: string | null;
  /** Köparens länk (visa/skriv ut/ångra köp), absolut. */
  readonly verUrl: string;
};

export function presentkortKvittoEmail(
  market: Market,
  data: PresentkortKvittoData,
): RenderedEmail {
  const ns = regaloNs(market).email.kvitto;
  const comun = emailNs(market).comun;
  const cuando = data.fechaEnvio ? ns.el({ fecha: data.fechaEnvio }) : ns.ahora;
  const texto = data.para
    ? ns.texto({ nombre: data.para, cuando })
    : ns.textoTuyo;
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
    textToHtmlParagraphs(ns.moms) +
    textToHtmlParagraphs(ns.arrepentimiento) +
    button(data.verUrl, ns.cta);
  const bodyText = [
    ns.titulo,
    texto,
    ...rows.map((r) => `${r.label}: ${r.value}`),
    ns.moms,
    ns.arrepentimiento,
    `${ns.cta}: ${data.verUrl}`,
  ].join("\n\n");
  const { html, text } = renderLayout({
    market,
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

export type PresentkortLeveransData = {
  readonly nombre: string;
  readonly de: string;
  readonly negocio: string;
  readonly valor: string;
  readonly validoHasta: string;
  readonly codigo: string;
  readonly saludo: string | null;
  readonly tema: PresentkortTheme;
  readonly reservarUrl: string;
  readonly verUrl: string;
  readonly direccion: string | null;
};

/** Kortet i vald färg (Lime/Lila; Foto = mörkt kort, inga externa bilder i
 * mejlen). Explicita färger på cellen (se `layout.ts` om mörkt läge). */
function giftCardBlock(
  tema: PresentkortTheme,
  negocio: string,
  etiqueta: string,
  valor: string,
  validoHasta: string,
): string {
  const bg = tema === "lime" ? c.lime : tema === "lilac" ? c.lilac : c.ink;
  const fg = tema === "photo" ? c.onDark : c.ink;
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

/** Hel bredd, rund (designen): bulletproof som `button` i layout.ts. */
function wideButton(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px;">
      <tr>
        <td align="center" bgcolor="${c.ink}" style="background-color:${c.ink};border-radius:999px;">
          <a href="${escapeHtml(href)}" target="_blank" rel="noopener" style="display:block;padding:18px 24px;font-family:${FONT_SANS};font-size:16px;font-weight:700;line-height:1;color:${c.onDark};text-decoration:none;border:none;border-radius:999px;text-align:center;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`;
}

function greetingBlock(text: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px;">
      <tr>
        <td bgcolor="${c.canvas}" style="background-color:${c.canvas};border-radius:16px;padding:16px 18px;font-family:${FONT_SANS};font-size:16px;line-height:1.6;font-style:italic;color:${c.ink};">”${escapeHtml(text).replace(/\n/g, "<br />")}”</td>
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

export function presentkortLeveransEmail(
  market: Market,
  data: PresentkortLeveransData,
): RenderedEmail {
  const ns = regaloNs(market).email.leverans;
  const comun = emailNs(market).comun;
  const titulo = ns.titulo({ nombre: data.nombre, de: data.de });
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
    wideButton(data.reservarUrl, ns.cta) +
    textToHtmlParagraphs(ayuda) +
    secondaryLink(data.verUrl, ns.saldo);
  const bodyText = [
    titulo,
    `${data.negocio} · ${ns.etiqueta} · ${data.valor}`,
    valido,
    ...(data.saludo ? [`”${data.saludo}”`] : []),
    `${ns.codigo}: ${data.codigo}`,
    `${ns.cta}: ${data.reservarUrl}`,
    ayuda,
    `${ns.saldo}: ${data.verUrl}`,
  ].join("\n\n");
  const { html, text } = renderLayout({
    market,
    preheader: ns.preheader({ negocio: data.negocio }),
    bodyHtml,
    bodyText,
    footerHtml: footerHtml(footer),
    footerText: footer.join("\n"),
  });
  return {
    subject: ns.asunto({ de: data.de, negocio: data.negocio }),
    preheader: ns.preheader({ negocio: data.negocio }),
    html,
    text,
  };
}
