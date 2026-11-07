/**
 * Fältfel och serverfel → text (`errores.reserva.*`). Uttömmande via `satisfies
 * Record<...>`, se docs/tasks/plans/WP-13.md steg 5.
 */
import { comun, errores, formulario } from "@/i18n";
import type { PhoneError } from "@/lib/format/phone";
import {
  ANSWER_LIMITS,
  type AnswerIssue,
  type AnswerIssueCode,
  type BookingQuestionDef,
} from "@/lib/validation/booking-questions";

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
  business_unavailable: errores.reserva.business_unavailable,
  rate_limited: errores.reserva.rate_limited,
  informed_consent_required: errores.reserva.informed_consent_required,
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

/**
 * Fältfelstexten för en dynamisk bokningsfråga (WP-40, D-031, se
 * `formulario.errores.respuesta`). `invalid_type`/`unknown_question` är
 * programmeringsfel — kan inte hända från det renderade formuläret
 * (`question-field.tsx` skickar alltid rätt typ, och frågelistan kommer
 * rakt av från `data.questionsByService`, se `customer-form.tsx`) — det
 * finns ingen egen copy för dem, `required` är närmaste rimliga text.
 */
export function answerFieldError(
  question: BookingQuestionDef,
  code: AnswerIssueCode,
): string {
  const r = formulario.errores.respuesta;
  switch (code) {
    case "required":
      return r.required;
    case "invalid_option":
      return r.invalid_option;
    case "duplicate_option":
      return r.duplicate_option;
    case "too_long":
      return r.too_long({
        max:
          question.kind === "long_text"
            ? ANSWER_LIMITS.longText
            : ANSWER_LIMITS.shortText,
      });
    case "invalid_number":
      return r.invalid_number;
    case "invalid_date":
      return r.invalid_date;
    case "invalid_type":
    case "unknown_question":
      return r.required;
  }
}

/** `AnswerIssue[]` (från `validateAnswers`) → `{ [questionId]: text }`, ett
 * fält per dynamisk fråga i `customer-form.tsx`. Ett svar utan `questionId`
 * (roten inte ett objekt) kan inte hända här (indata byggs alltid som ett
 * objekt, se `customer-form.tsx`) och hoppas över. */
export function answersToFieldErrors(
  questions: readonly BookingQuestionDef[],
  issues: readonly AnswerIssue[],
): Record<string, string> {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const out: Record<string, string> = {};
  for (const issue of issues) {
    if (!issue.questionId) continue;
    const question = byId.get(issue.questionId);
    if (!question) continue;
    out[issue.questionId] = answerFieldError(question, issue.code);
  }
  return out;
}
