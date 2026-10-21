/**
 * Klientvalidering utan Zod (qa-granskning, item 6): `form-schema.ts` (Zod)
 * är bara till servern (`actions.ts`) — Zod (och dess språkfiler) fick inte
 * bunta med i klientkomponenten. Samma gränser som WP-10:s
 * `customerInputSchema` (`src/server/scheduling/schemas.ts`): namn max 120,
 * e-post max 254. Telefonen valideras med den riktiga, delade
 * `parsePhone` (`@/lib/format/phone`, installationens land), ingen egen kopia.
 *
 * `NAME_MAX` sätts som `maxLength` på fältet (`text-field.tsx`) i stället för
 * att kontrolleras här: webbläsaren hindrar redan inmatning längre än så, och
 * det finns ingen egen `errores.reserva`-text för "för långt namn" (bara
 * `nombreVacio`) — `src/i18n/` är inte WP-13:s att ändra. Servern (Zod,
 * `form-schema.ts`) är den slutgiltiga kontrollen: en manipulerad förfrågan
 * som ändå överskrider gränsen ger `invalid_input`.
 *
 * `validateRequiredEmail` (WP-16, D-030): e-post är obligatorisk i Reserva
 * (samma regel som serverns `bookingFormSchema`, `form-schema.ts`).
 * `validateEmail` (frivillig) används fortfarande av `manual-booking-dialog.tsx`
 * (ägarens manuella bokning) — D-030 gäller bara kundens Reserva-formulär.
 */
import { parsePhone, phoneErrorKey, type E164 } from "@/lib/format/phone";

export const NAME_MAX = 120;
export const EMAIL_MAX = 254;

export type FieldResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: string };

// Samma mönster som Zod v4:s inbyggda `z.email()` (kopierad, inte importerad
// — se filkommentaren). En ren regex drar inte in någon körtidsberoende.
const EMAIL_PATTERN =
  /^(?:[A-Za-z0-9_'+-]+\.)*[A-Za-z0-9_'+-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;

export function validateName(raw: string): FieldResult<string> {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, code: "name.empty" };
  return { ok: true, value: trimmed };
}

export function validatePhone(raw: string): FieldResult<E164> {
  const r = parsePhone(raw);
  if (!r.ok) return { ok: false, code: `phone.${phoneErrorKey(r.error)}` };
  return { ok: true, value: r.value };
}

/** Tom sträng ger `value: undefined` (frivilligt fält). */
export function validateEmail(raw: string): FieldResult<string | undefined> {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: undefined };
  if (trimmed.length > EMAIL_MAX || !EMAIL_PATTERN.test(trimmed)) {
    return { ok: false, code: "email.invalid" };
  }
  return { ok: true, value: trimmed };
}

/** Som `validateEmail`, men obligatorisk (D-030): en tom sträng ger samma kod
 * som en ogiltig ("email.invalid"), precis som servern (`bookingFormSchema`). */
export function validateRequiredEmail(
  raw: string,
): FieldResult<string | undefined> {
  if (raw.trim() === "") return { ok: false, code: "email.invalid" };
  return validateEmail(raw);
}
