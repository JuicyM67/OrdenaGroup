import "server-only";

/**
 * Chilenskt mobilnummer i E.164: `+569` + 8 siffror (D-063). Bara sådana
 * får WhatsApp — plattformens nummer är chilenskt (D-007) och Reserva tar
 * bara emot mobil (`mobileInputSchema`); ett fast nummer eller ett utländskt
 * nummer går som e-post.
 */
const CL_MOBILE = /^\+569\d{8}$/;

export function isChileanMobile(e164: string | null | undefined): boolean {
  return typeof e164 === "string" && CL_MOBILE.test(e164);
}

/** Webhookens `from` (wa_id, bara siffror) mot kundens E.164. */
export function sameWhatsAppNumber(
  waId: string | null | undefined,
  e164: string | null | undefined,
): boolean {
  if (typeof waId !== "string" || typeof e164 !== "string") return false;
  if (!/^\d{8,15}$/.test(waId)) return false;
  return `+${waId}` === e164;
}
