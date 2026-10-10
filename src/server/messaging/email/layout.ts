import "server-only";

import { brand, type Market } from "@/config/brand";

import { emailColors as c } from "./colors";

/**
 * Byggstenar för HTML-mejl: tabellbaserad layout, inline-CSS, max 600 px.
 * Inga externa bilder (utom SE:s märke, D-049): loggan är text/HTML (D-026, se `BrandLogo`-mönstret
 * i src/components/marketing/).
 *
 * Mörkt läge (WP-49): vi kör `color-scheme: light only` (meta +
 * `supported-color-schemes` + CSS), dvs mejlen ber uttryckligen klienten
 * att INTE auto-invertera färger. Anledningen är en bugg vi såg i Apple
 * Mail/iOS: med `content="light dark"` + en ofullständig
 * `@media (prefers-color-scheme: dark)`-overlay (bara vissa element hade
 * `class="text-ink"`/`.text-muted`) körde klienten sin egen
 * "smart invert"-heuristik ovanpå — resultatet var att ordmärket, koden och
 * knappen blev mörk text på mörk botten (osynligt) och knappen fick en
 * konstig ikon. Lösningen: `light only` stänger av den automatiska
 * processen helt, och varje färg nedan (knapp, kod, logga, kort) är satt
 * som explicit hex på VARJE tabellcell (både `style` och `bgcolor`, för
 * klienter som stryker `<style>`), aldrig beroende av en klass som kan
 * vara ofullständig. Vill vi senare stödja ett riktigt (frivilligt) mörkt
 * tema får det göras element för element, med samma bulletproof-princip —
 * hellre inget mörkt läge alls än ett halvfärdigt.
 *
 * Ingen JSX: e-postklienter tolererar bara ett litet HTML-delmängd, och de
 * här funktionerna körs lika gärna i en cron-worker som i en route handler
 * — vanliga funktioner som returnerar strängar är enklast att testa och
 * kräver ingen react-dom/server.
 */

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-family:${FONT_SANS};font-size:15px;line-height:1.5;color:${c.ink};">${escapeHtml(
    text,
  )}</p>`;
}

/** Liten, dämpad text (13px) — vencer-/ignorar-raderna i åtkomstmejlen. */
export function caption(text: string): string {
  return `<p style="margin:0 0 4px;font-family:${FONT_SANS};font-size:13px;line-height:1.5;color:${c.muted};">${escapeHtml(
    text,
  )}</p>`;
}

/** Koden i klartext (`{{ .Token }}`/6 siffror), i en egen ljus ruta med
 * mörk text (D-030/WP-49): bakgrund och textfärg är explicita, inte klass-
 * styrda — den ska synas oavsett vad klienten gör med mörkt läge, precis
 * som `button(..., "lime")`. `label` är redan översatt (`ns.codigo`). */
export function codeLine(label: string, code: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;">
      <tr>
        <td style="padding:0 0 6px;font-family:${FONT_SANS};font-size:13px;color:${c.muted};">${escapeHtml(
          label,
        )}</td>
      </tr>
      <tr>
        <td align="center" bgcolor="${c.canvas}" style="background-color:${c.canvas};border:1px solid ${c.border};border-radius:12px;padding:12px 16px;font-family:${FONT_SANS};font-size:20px;font-weight:700;letter-spacing:4px;color:${c.ink};text-align:center;">${escapeHtml(
          code,
        )}</td>
      </tr>
    </table>`;
}

export function heading(text: string): string {
  return `<p style="margin:0 0 16px;font-family:${FONT_DISPLAY};font-weight:800;font-size:24px;line-height:1.25;letter-spacing:-0.02em;color:${c.ink};">${escapeHtml(
    text,
  )}</p>`;
}

/** `\n\n` → nytt stycke, `\n` → radbrytning, i övrigt escapat. */
export function textToHtmlParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="margin:0 0 16px;font-family:${FONT_SANS};font-size:15px;line-height:1.5;color:${c.ink};">${escapeHtml(
          block,
        ).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");
}

const FONT_DISPLAY =
  "'Bricolage Grotesque','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FONT_SANS =
  "'Plus Jakarta Sans','Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Ordmärket, samma innehåll som `BrandLogo` (CL: limecirkel + namn, SE:
 * "Booking" + limebricka "Buddy") men som tabellbaserad HTML utan bilder.
 * Text på en explicit ljus botten (`bgcolor` + `background-color` på
 * cellen, inte bara på `<body>`) — det var just den okantade "Booking"-
 * texten (ingen egen bakgrund, ingen klass) som blev osynlig i mörkt läge
 * innan WP-49, se filkommentaren ovan. */
function wordmarkHtml(market: Market): string {
  if (market === "SE") {
    // D-049: b-klockan som hostad PNG (public/brand/bb-mark-email.png, 2x) + "booking" (600)
    // och "buddy" (800) som text. Bilden har alt-text så att namnet syns även utan bilder.
    const words = brand.name.toLowerCase().split(" ");
    const first = words[0] ?? brand.name;
    const rest = words.slice(1).join(" ");
    const src = `https://${brand.domain ?? ""}/brand/bb-mark-email.png`;
    return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.canvas}">
      <tr>
        <td bgcolor="${c.canvas}" style="background-color:${c.canvas};padding:0 8px 0 0;vertical-align:middle;"><img src="${src}" width="28" height="28" alt="" style="display:block;width:28px;height:28px;border:0;" /></td>
        <td bgcolor="${c.canvas}" style="background-color:${c.canvas};vertical-align:middle;font-family:${FONT_DISPLAY};font-size:21px;letter-spacing:-0.03em;color:${c.ink};"><span style="font-weight:600;">${escapeHtml(first)}</span>${rest ? `<span style="font-weight:800;">${escapeHtml(rest)}</span>` : ""}</td>
      </tr>
    </table>`;
  }
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.canvas}">
      <tr>
        <td bgcolor="${c.lime}" style="width:32px;height:32px;border-radius:16px;background-color:${c.lime};text-align:center;vertical-align:middle;font-family:${FONT_DISPLAY};font-weight:700;font-size:14px;line-height:32px;color:${c.onLimeSoft};" align="center">●</td>
        <td bgcolor="${c.canvas}" style="background-color:${c.canvas};padding-left:10px;font-family:${FONT_DISPLAY};font-weight:700;font-size:19px;color:${c.ink};">${escapeHtml(
          brand.name,
        )}</td>
      </tr>
    </table>`;
}

export type ButtonVariant = "ink" | "lime";

/** Bulletproof-knapp (tabellcell med `bgcolor` + `background-color`, ingen
 * bild, ingen ikon): bakgrund och text är fasta hex, aldrig klass-styrda,
 * så den håller sig läsbar oavsett vad klienten gör med mörkt läge (se
 * filkommentaren ovan). `border:none` på länken tar bort ev.
 * standardram/fokusruta som vissa klienter annars ritar som en liten
 * "ikon"-ruta efter texten. */
export function button(
  href: string,
  label: string,
  variant: ButtonVariant = "ink",
): string {
  const bg = variant === "lime" ? c.lime : c.ink;
  const fg = variant === "lime" ? c.onLimeSoft : c.onDark;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;">
      <tr>
        <td style="border-radius:16px;background-color:${bg};" bgcolor="${bg}">
          <a href="${escapeHtml(href)}" target="_blank" rel="noopener"
            style="display:inline-block;padding:13px 24px;font-family:${FONT_SANS};font-weight:700;font-size:15px;line-height:1;color:${fg};background-color:${bg};text-decoration:none;border:none;border-radius:16px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

export function secondaryLink(href: string, label: string): string {
  return `<p style="margin:0 0 8px;"><a href="${escapeHtml(href)}" target="_blank" rel="noopener" style="font-family:${FONT_SANS};font-size:14px;font-weight:600;color:${c.ink};">${escapeHtml(
    label,
  )}</a></p>`;
}

export type BookingCardRow = { readonly label: string; readonly value: string };

/** Bokningskortet (tjänst, tid, profesional, adress, pris): samma pastellkort
 * som appens kort (DESIGN.md §2, lime-accent), en rad per fält som finns. */
export function bookingCard(rows: readonly BookingCardRow[]): string {
  const cells = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:6px 0;font-family:${FONT_SANS};font-size:13px;color:${c.onLimeSoft};opacity:0.75;" width="35%">${escapeHtml(
          r.label,
        )}</td>
        <td style="padding:6px 0;font-family:${FONT_SANS};font-size:14px;font-weight:600;color:${c.onLimeSoft};text-align:right;">${escapeHtml(
          r.value,
        )}</td>
      </tr>`,
    )
    .join("");
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${c.lime};border-radius:20px;padding:18px 20px;margin:8px 0 24px;" bgcolor="${c.lime}">
      ${cells}
    </table>`;
}

/** Punktlista (t.ex. `bienvenida.pasos`): en `<table>`-rad per punkt med en
 * limeprick, samma mönster som kortet ovan (inga `<ul>`-marginaler, Outlook
 * ritar dem olika). */
export function stepList(items: readonly string[]): string {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:0 10px 10px 0;vertical-align:top;width:8px;">
          <div style="width:8px;height:8px;margin-top:7px;border-radius:4px;background-color:${c.lime};"></div>
        </td>
        <td style="padding:0 0 10px;font-family:${FONT_SANS};font-size:14px;line-height:1.5;color:${c.ink};">${escapeHtml(
          item,
        )}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 20px;">${rows}</table>`;
}

export type EmailLayoutInput = {
  readonly market: Market;
  readonly preheader: string;
  readonly bodyHtml: string;
  readonly bodyText: string;
  readonly footerHtml: string;
  readonly footerText: string;
};

/** Företagsuppgifter ur brand.ts i sidfoten — bara riktiga värden, aldrig platshållare
 * (de börjar med "["). */
function legalFooterHtml(): string {
  const { legalName, address } = brand.legal;
  const parts = [legalName, address].filter((v) => !v.startsWith("["));
  if (parts.length === 0) return "";
  return `<p style="margin:8px 0 0;font-family:${FONT_SANS};font-size:12px;line-height:1.5;color:${c.subtle};">${escapeHtml(
    parts.join(" · "),
  )}</p>`;
}

/** Slår ihop header, innehållskort och footer till ett fullständigt
 * HTML-dokument + en textversion. */
export function renderLayout(input: EmailLayoutInput): {
  html: string;
  text: string;
} {
  const html = `<!DOCTYPE html>
<html lang="${input.market === "SE" ? "sv-SE" : "es-CL"}" style="color-scheme:light only;supported-color-schemes:light only;">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light only" />
    <title></title>
    <style>
      :root { color-scheme: light only; supported-color-schemes: light only; }
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; border: 0; line-height: 100%; outline: none; text-decoration: none; }
      body { margin: 0; padding: 0; width: 100% !important; background-color: ${c.canvas}; }
      @media only screen and (max-width: 620px) {
        .container { width: 100% !important; }
        .px { padding-left: 20px !important; padding-right: 20px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:${c.canvas};color-scheme:light only;" bgcolor="${c.canvas}">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(
      input.preheader,
    )}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${c.canvas};" bgcolor="${c.canvas}">
      <tr>
        <td align="center" style="padding:32px 16px;background-color:${c.canvas};" bgcolor="${c.canvas}">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="container" style="width:600px;max-width:600px;background-color:${c.canvas};" bgcolor="${c.canvas}">
            <tr>
              <td class="px" style="padding:0 8px 24px;background-color:${c.canvas};" bgcolor="${c.canvas}">${wordmarkHtml(input.market)}</td>
            </tr>
            <tr>
              <td style="background-color:${c.lime};height:6px;line-height:6px;font-size:0;border-radius:24px 24px 0 0;" bgcolor="${c.lime}">&nbsp;</td>
            </tr>
            <tr>
              <td class="px" style="background-color:${c.surface};border-radius:0 0 24px 24px;padding:32px;" bgcolor="${c.surface}">
                ${input.bodyHtml}
              </td>
            </tr>
            <tr>
              <td class="px" style="padding:24px 8px 0;background-color:${c.canvas};" bgcolor="${c.canvas}">${input.footerHtml}${legalFooterHtml()}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `${input.bodyText.trim()}\n\n—\n${input.footerText.trim()}\n`;
  return { html, text };
}

export function footerHtml(lines: readonly string[]): string {
  return lines
    .map(
      (l) =>
        `<p style="margin:0 0 4px;font-family:${FONT_SANS};font-size:12px;line-height:1.5;color:${c.muted};">${escapeHtml(
          l,
        )}</p>`,
    )
    .join("");
}

export type SimpleEmailContent = {
  readonly market: Market;
  readonly subject: string;
  readonly preheader: string;
  readonly titulo: string;
  /** Ett stycke per post (redan separerade, inte `\n\n`-delad text). */
  readonly paragraphs: readonly string[];
  readonly cardRows?: readonly BookingCardRow[];
  readonly steps?: readonly string[];
  readonly cta: {
    readonly label: string;
    readonly href: string;
    readonly variant?: ButtonVariant;
  };
  readonly footerLines: readonly string[];
};

/** De fem nya HTML-mejlen (`bienvenida`, `nuevaReservaDueno`,
 * `cancelacionDueno`, `listaEsperaCupo`, `horaFlash`) delar samma form:
 * rubrik, ett eller flera stycken, ett valfritt bokningskort eller en
 * punktlista, en knapp och en fot — det här bygger dem alla, så varje mall
 * bara behöver plocka ihop rätt `email.*`-fält (regel hård 6: texten kommer
 * härifrån, inte påhittad i denna funktion). */
export function composeSimpleEmail(content: SimpleEmailContent): {
  subject: string;
  preheader: string;
  html: string;
  text: string;
} {
  const bodyHtml =
    heading(content.titulo) +
    content.paragraphs.map((p) => textToHtmlParagraphs(p)).join("") +
    (content.cardRows ? bookingCard(content.cardRows) : "") +
    (content.steps ? stepList(content.steps) : "") +
    button(content.cta.href, content.cta.label, content.cta.variant);

  const bodyText = [
    content.titulo,
    ...content.paragraphs,
    ...(content.steps ?? []),
  ].join("\n\n");

  const { html, text } = renderLayout({
    market: content.market,
    preheader: content.preheader,
    bodyHtml,
    bodyText,
    footerHtml: footerHtml(content.footerLines),
    footerText: content.footerLines.join("\n"),
  });
  return { subject: content.subject, preheader: content.preheader, html, text };
}

export { FONT_DISPLAY, FONT_SANS };
