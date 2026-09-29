import "server-only";

/**
 * GSM 03.38 (alfabeto por defecto de SMS): calcula si un texto cabe en
 * GSM-7 o necesita UCS-2, y cuántos segmentos ocupa. Aproximado pero
 * correcto para los caracteres que de verdad aparecen en `sms.*`
 * (es-CL/sv-SE) — no implementa el shift table completo de GSM 03.38, solo
 * el conjunto básico + el de extensión (`ES`), que es lo único que ClickSend
 * necesita para decidir la codificación.
 *
 * Importante para copywriter-es-cl: á, í, ó, ú NO están en GSM-7 (solo à, è,
 * é, ì, ò, ù sin embargo é sí). Un solo acento agudo obliga a todo el SMS a
 * UCS-2 (70 caracteres por segmento en vez de 160/153).
 */
const GSM7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

/** Cuestan 2 septetos (van precedidos del carácter de escape 0x1B). */
const GSM7_EXTENDED = "^{}\\[~]|€\f";

const BASIC_SET = new Set(GSM7_BASIC);
const EXTENDED_SET = new Set(GSM7_EXTENDED);

export type SmsEncoding = "gsm7" | "ucs2";

export type SmsLengthInfo = {
  readonly encoding: SmsEncoding;
  /** Caracteres (`text.length`, no septetos/segmentos). */
  readonly length: number;
  readonly segments: number;
  /** `length > 160` (regla del proyecto: avisa sin importar la codificación). */
  readonly warning: string | null;
};

function isPureGsm7(text: string): boolean {
  for (const ch of text) {
    if (!BASIC_SET.has(ch) && !EXTENDED_SET.has(ch)) return false;
  }
  return true;
}

function gsm7Septets(text: string): number {
  let n = 0;
  for (const ch of text) n += EXTENDED_SET.has(ch) ? 2 : 1;
  return n;
}

export function smsLengthInfo(text: string): SmsLengthInfo {
  const gsm7 = isPureGsm7(text);
  const encoding: SmsEncoding = gsm7 ? "gsm7" : "ucs2";

  let segments: number;
  if (gsm7) {
    const septets = gsm7Septets(text);
    segments =
      septets <= 160 ? (septets === 0 ? 0 : 1) : Math.ceil(septets / 153);
  } else {
    const units = text.length; // UCS-2: 1 unidad por carácter (aprox., sin pares suplentes)
    segments = units <= 70 ? (units === 0 ? 0 : 1) : Math.ceil(units / 67);
  }

  return {
    encoding,
    length: text.length,
    segments,
    warning:
      text.length > 160
        ? `${String(text.length)} caracteres (> 160): se enviará en ${String(segments)} segmentos${
            encoding === "ucs2"
              ? " (UCS-2: acentos como á/í/ó/ú fuerzan esta codificación)"
              : ""
          }.`
        : null,
  };
}
