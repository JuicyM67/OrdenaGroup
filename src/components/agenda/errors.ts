/**
 * Fältfel och serverfel för dialogerna "Nueva reserva"/"Mover" (WP-21b),
 * samma mönster som `src/components/booking/errors.ts`. `BookingError` (för
 * `slot_taken`/`outside_hours`/…) mappas mot `errores.agenda`.
 *
 * `errores.agenda` har inga egna namn/telefon/e-post-fältfel — samma texter
 * som `errores.reserva.nombreVacio`/`emailInvalido`/`telefono.*` återanvänds
 * (rapporterat som saknad sträng i WP-21b:s rapport).
 */
import { errores } from "@/i18n";
import type { PhoneError } from "@/lib/format/phone";
// `import type` raderas vid kompilering (ingen JS-emission), säker i en
// "use client"-fil trots att @/server/bookings/types har `import "server-only"`
// som värde-import — se src/components/booking/types.ts.
import type {
  BookingError,
  GiftCardBookingError,
} from "@/server/bookings/types";

export type ManualFieldError =
  | { field: "service"; kind: "empty" }
  | { field: "staff"; kind: "empty" }
  | { field: "date"; kind: "empty" }
  | { field: "time"; kind: "empty" }
  | { field: "name"; kind: "empty" }
  | { field: "phone"; kind: PhoneError }
  | { field: "email"; kind: "invalid" };

const PHONE_MESSAGES = errores.reserva.telefono satisfies Record<
  PhoneError,
  string
>;

export function manualFieldError(issue: ManualFieldError): string {
  switch (issue.field) {
    case "service":
    case "staff":
    case "date":
    case "time":
      return errores.agenda.invalid_input;
    case "name":
      return errores.reserva.nombreVacio;
    case "phone":
      return PHONE_MESSAGES[issue.kind];
    case "email":
      return errores.reserva.emailInvalido;
  }
}

const SERVER_MESSAGES = {
  slot_taken: errores.agenda.slot_taken,
  too_soon: errores.agenda.too_soon,
  too_far: errores.agenda.too_far,
  service_not_offered: errores.agenda.service_not_offered,
  not_found: errores.agenda.not_found,
  invalid_status: errores.agenda.invalid_status,
  outside_cancel_window: errores.agenda.outside_cancel_window,
  invalid_input: errores.agenda.invalid_input,
  outside_hours: errores.agenda.outside_hours,
  business_unavailable: errores.agenda.business_unavailable,
  forbidden: errores.permiso.generico,
} satisfies Record<Exclude<BookingError, GiftCardBookingError>, string>;

function isKnownServerErrorCode(
  code: string,
): code is Exclude<BookingError, GiftCardBookingError> {
  return code in SERVER_MESSAGES;
}

/** Okänd kod (t.ex. ett infrastrukturfel) → `errores.agenda.network`. */
export function agendaServerError(code: string): string {
  return isKnownServerErrorCode(code)
    ? SERVER_MESSAGES[code]
    : errores.agenda.network;
}
