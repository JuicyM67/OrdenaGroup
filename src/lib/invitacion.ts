// "Pedir una invitación" (stängd beta, src/config/beta.ts): ett mejl till hola@ med ämne
// och ett ifyllt meddelande. Delas av startsidans beta-sektion och beta-sidan
// (/comenzar, /app/beta).
import { brand } from "@/config/brand";
import { copy } from "@/i18n/marketing";

/** Adressen som tar emot förfrågningarna (hola@<domän>, annars kontaktadressen). */
export function invitacionEmail(): string {
  return brand.domain ? `hola@${brand.domain}` : brand.legal.contactEmail;
}

/** `mailto:`-länken. `email` (t.ex. från startsidans e-postfält) följer med i texten. */
export function invitacionMailto(email?: string): string {
  const t = copy.home.beta;
  const params = [
    `subject=${encodeURIComponent(t.asuntoCorreo)}`,
    `body=${encodeURIComponent(t.cuerpoCorreo({ email: email ?? "" }))}`,
  ];
  return `mailto:${invitacionEmail()}?${params.join("&")}`;
}
