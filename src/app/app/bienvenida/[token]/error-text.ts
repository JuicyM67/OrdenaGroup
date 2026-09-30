import { invitacionNegocio } from "@/i18n/auth";

/** `code` puede venir de `getInvitationPreview` (`not_found`/`accepted`/
 * `expired`) o de `acceptInvitation` (`not_found`/`used_or_expired`/
 * `email_mismatch`/`unknown`) — `used_or_expired` reutiliza el texto de
 * "expired" (el RPC no distingue entre ambos casos, mismo SQLSTATE). */
export function invitationErrorText(code: string): string {
  switch (code) {
    case "not_found":
      return invitacionNegocio.errores.not_found;
    case "accepted":
      return invitacionNegocio.errores.accepted;
    case "expired":
    case "used_or_expired":
      return invitacionNegocio.errores.expired;
    case "email_mismatch":
      return invitacionNegocio.errores.email_mismatch;
    default:
      return invitacionNegocio.errores.network;
  }
}
