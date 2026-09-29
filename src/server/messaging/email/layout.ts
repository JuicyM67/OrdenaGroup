import "server-only";

import { brand, type Market } from "@/config/brand";

import { emailColors as c } from "./colors";

/**
 * Byggstenar för HTML-mejl: tabellbaserad layout, inline-CSS, max 600 px,
 * mörk-läge-vänlig via `<style>`-overrides (kräver klassnamn, inte bara
 * inline — inline vinner annars alltid). Inga externa bilder: loggan är
 * text/HTML (D-026, se `BrandLogo`-mönstret i src/components/marketing/).
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
  return `<p style="margin:0 0 16px;font-family:${FONT_SANS};font-size:15px;line-height:1.5;color:${c.ink};" class="text-ink">${escapeHtml(
    text,
  )}</p>`;
}

/** Liten, dämpad text (13px) — vencer-/ignorar-raderna i åtkomstmejlen. */
export function caption(text: string): string {
  return `<p style="margin:0 0 4px;font-family:${FONT_SANS};font-size:13px;line-height:1.5;color:${c.muted};" class="text-muted">${escapeHtml(
    text,
  )}</p>`;
}

/** Koden i klartext (`{{ .Token }}`/6 siffror), framhävd, bredvid en
 * etikett som redan är översatt (`ns.codigo`). */
export function codeLine(label: string, code: string): string {
  return `<p style="margin:0 0 8px;font-family:${FONT_SANS};font-size:13px;color:${c.muted};" class="text-muted">${escapeHtml(
    label,
  )} <strong style="color:${c.ink};letter-spacing:2px;">${escapeHtml(code)}</strong></p>`;
}

export function heading(text: string): string {
  return `<p style="margin:0 0 16px;font-family:${FONT_DISPLAY};font-weight:700;font-size:22px;color:${c.ink};" class="text-ink">${escapeHtml(
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
 * "Booking" + limebricka "Buddy") men som tabellbaserad HTML utan bilder. */
function wordmarkHtml(market: Market): string {
  if (market === "SE") {
    const words = brand.name.split(" ");
    const first = words[0] ?? brand.name;
    const rest = words.slice(1).join(" ");
    return `<span style="font-family:${FONT_DISPLAY};font-weight:700;font-size:19px;color:${c.ink};">${escapeHtml(
      first,
    )}</span>${
      rest
        ? ` <span style="font-family:${FONT_DISPLAY};font-weight:700;font-size:19px;color:${c.onLimeSoft};background-color:${c.lime};border-radius:8px;padding:2px 8px;">${escapeHtml(
            rest,
          )}</span>`
        : ""
    }`;
  }
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="width:32px;height:32px;border-radius:16px;background-color:${c.lime};text-align:center;vertical-align:middle;font-family:${FONT_DISPLAY};font-weight:700;font-size:14px;line-height:32px;color:${c.onLimeSoft};" align="center">●</td>
        <td style="padding-left:10px;font-family:${FONT_DISPLAY};font-weight:700;font-size:19px;color:${c.ink};" class="text-ink">${escapeHtml(
          brand.name,
        )}</td>
      </tr>
    </table>`;
}

export type ButtonVariant = "ink" | "lime";

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
            style="display:inline-block;padding:13px 24px;font-family:${FONT_SANS};font-weight:700;font-size:15px;color:${fg};text-decoration:none;border-radius:16px;">
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
        <td style="padding:0 0 10px;font-family:${FONT_SANS};font-size:14px;line-height:1.5;color:${c.ink};" class="text-ink">${escapeHtml(
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

/** Slår ihop header, innehållskort och footer till ett fullständigt
 * HTML-dokument + en textversion. */
export function renderLayout(input: EmailLayoutInput): {
  html: string;
  text: string;
} {
  const html = `<!DOCTYPE html>
<html lang="${input.market === "SE" ? "sv-SE" : "es-CL"}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title></title>
    <style>
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; border: 0; line-height: 100%; outline: none; text-decoration: none; }
      body { margin: 0; padding: 0; width: 100% !important; background-color: ${c.canvas}; }
      @media (prefers-color-scheme: dark) {
        .bg-canvas { background-color: ${c.dark} !important; }
        .bg-surface { background-color: ${c.dark} !important; border-color: ${c.darkLine} !important; }
        .text-ink { color: ${c.onDark} !important; }
        .text-muted { color: ${c.onDarkMuted} !important; }
      }
      @media only screen and (max-width: 620px) {
        .container { width: 100% !important; }
        .px { padding-left: 20px !important; padding-right: 20px !important; }
      }
    </style>
  </head>
  <body class="bg-canvas" style="margin:0;padding:0;background-color:${c.canvas};" bgcolor="${c.canvas}">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(
      input.preheader,
    )}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-canvas" style="background-color:${c.canvas};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="container" style="width:600px;max-width:600px;">
            <tr>
              <td class="px" style="padding:0 8px 24px;">${wordmarkHtml(input.market)}</td>
            </tr>
            <tr>
              <td class="bg-surface px" style="background-color:${c.surface};border-radius:24px;padding:32px;" bgcolor="${c.surface}">
                ${input.bodyHtml}
              </td>
            </tr>
            <tr>
              <td class="px" style="padding:24px 8px 0;">${input.footerHtml}</td>
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
        `<p style="margin:0 0 4px;font-family:${FONT_SANS};font-size:12px;line-height:1.5;color:${c.muted};" class="text-muted">${escapeHtml(
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
