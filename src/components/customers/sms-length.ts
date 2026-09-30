// WP-55: versión "use client" segura de `smsLengthInfo`
// (`src/server/messaging/sms/gsm7.ts`) — ese archivo vive bajo `src/server/`
// y empieza con `import "server-only"` (regla del proyecto, boundaries.test.ts),
// así que no se puede importar desde un componente cliente. Es una copia a
// propósito, no una reexportación: solo lo que necesita el contador del
// diálogo de "Enviar mensaje" (`message-dialog.tsx`), mismo algoritmo
// (GSM 03.38 básico + extensión) pero sin el resto de `SmsLengthInfo`
// (`warning`, etc., que el diálogo no usa).
const GSM7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXTENDED = "^{}\\[~]|€\f";

const BASIC_SET = new Set(GSM7_BASIC);
const EXTENDED_SET = new Set(GSM7_EXTENDED);

export type ClientSmsLengthInfo = {
  readonly encoding: "gsm7" | "ucs2";
  readonly segments: number;
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

/** Igual que `smsLengthInfo` del servidor (solo `encoding`/`segments`, el
 * contador del diálogo no necesita `warning`/`length`: usa `text.length`
 * directo para eso). */
export function clientSmsLengthInfo(text: string): ClientSmsLengthInfo {
  const gsm7 = isPureGsm7(text);
  if (gsm7) {
    const septets = gsm7Septets(text);
    return {
      encoding: "gsm7",
      segments: septets <= 160 ? (septets === 0 ? 0 : 1) : Math.ceil(septets / 153),
    };
  }
  const units = text.length;
  return {
    encoding: "ucs2",
    segments: units <= 70 ? (units === 0 ? 0 : 1) : Math.ceil(units / 67),
  };
}
