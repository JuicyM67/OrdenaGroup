/**
 * Fältfel och serverfel → text (`errores.reserva.*`). Uttömmande via `satisfies
 * Record<...>`, se docs/tasks/plans/WP-13.md steg 5.
 */
import { comun, errores, reserva } from "@/i18n";
import type { PhoneError } from "@/lib/format/phone";

import type { BookingServerErrorCode } from "./types";

export type ClientFieldError =
  | { field: "name"; kind: "empty" }
  | { field: "phone"; kind: PhoneError }
  | { field: "email"; kind: "invalid" }
  | { field: "terms"; kind: "required" };

const PHONE_MESSAGES = errores.reserva.telefono satisfies Record<
  PhoneError,
  string
>;

/** Texten för ett fältfel i `customer-form.tsx`. */
export function fieldError(issue: ClientFieldError): string {
  switch (issue.field) {
    case "name":
      return errores.reserva.nombreVacio;
    case "phone":
      return PHONE_MESSAGES[issue.kind];
    case "email":
      return errores.reserva.emailInvalido;
    case "terms":
      return errores.reserva.consentimientoRequerido;
  }
}

const SERVER_MESSAGES = {
  slot_taken: errores.reserva.slot_taken,
  too_soon: errores.reserva.too_soon,
  too_far: errores.reserva.too_far,
  service_not_offered: errores.reserva.service_not_offered,
  not_found: errores.reserva.not_found,
  invalid_status: errores.reserva.invalid_status,
  outside_cancel_window: errores.reserva.outside_cancel_window,
  invalid_input: errores.reserva.invalid_input,
  outside_hours: errores.reserva.outside_hours,
  waitlist_duplicate: errores.reserva.waitlist_duplicate,
  network: errores.reserva.network,
  // Ingen egen `errores.reserva`-nyckel (qa-granskning, item 5/11): samma text
  // som den tomma sidans `vacios.negocioNoDisponible` — negocio inte aktivt.
  business_unavailable: reserva.vacios.negocioNoDisponible,
} satisfies Record<BookingServerErrorCode, string>;

const PHONE_ERROR_KINDS = new Set<string>([
  "empty",
  "invalid_chars",
  "not_chilean",
  "invalid_length",
  "not_mobile",
  "invalid_prefix",
]);

/** `zod`-issue-meddelandet ("phone.not_mobile", "name.empty", "email.invalid",
 * "terms.required") → `ClientFieldError`, för `customerFormSchema`/
 * `waitlistFormSchema` i `form-schema.ts`. `null` om koden inte känns igen. */
export function zodIssueToFieldError(message: string): ClientFieldError | null {
  const dot = message.indexOf(".");
  if (dot === -1) return null;
  const field = message.slice(0, dot);
  const kind = message.slice(dot + 1);
  switch (field) {
    case "name":
      return { field: "name", kind: "empty" };
    case "phone":
      return PHONE_ERROR_KINDS.has(kind)
        ? { field: "phone", kind: kind as PhoneError }
        : null;
    case "email":
      return { field: "email", kind: "invalid" };
    case "terms":
      return { field: "terms", kind: "required" };
    default:
      return null;
  }
}

function isKnownServerErrorCode(code: string): code is BookingServerErrorCode {
  return code in SERVER_MESSAGES;
}

/** En okänd kod ger `comun.algoSalioMal` i stället för att krascha UI:t
 * (t.ex. om servern en dag skickar en kod som klienten inte känner igen). */
export function serverError(code: string): string {
  return isKnownServerErrorCode(code)
    ? SERVER_MESSAGES[code]
    : comun.algoSalioMal;
}
