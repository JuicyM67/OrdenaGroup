// Felkod → texto för kategorier och bokningsfrågor (WP-40 steg 5–8, D-031).
// Samma alfabet som `BookingFormErrorCode`
// (`src/server/owner/booking-questions.ts`) och `firstCode`
// (`src/server/owner/booking-questions-schemas.ts`), duplicerat i stället
// för importerat (samma regel som `./error-text.ts`).
import { comun, formulario, validacion } from "@/i18n";

const KNOWN: Record<string, string> = {
  invalid_input: comun.algoSalioMal,
  not_found: comun.algoSalioMal,
  unauthorized: comun.algoSalioMal,
  too_many_questions: formulario.errores.too_many_questions,
  invalid_target: comun.algoSalioMal,
  preset_not_found: comun.algoSalioMal,
  "category.name_empty": validacion.requerido,
  "category.name_too_long": comun.algoSalioMal,
  "category.name_taken": comun.algoSalioMal,
  "question.label_empty": validacion.requerido,
  "question.label_too_long": comun.algoSalioMal,
  "question.help_too_long": comun.algoSalioMal,
  "question.kind_invalid": comun.algoSalioMal,
  "question.options_required": comun.algoSalioMal,
  "question.options_invalid": comun.algoSalioMal,
  "question.options_duplicate": comun.algoSalioMal,
  unknown: comun.algoSalioMal,
};

/** En okänd kod ger `comun.algoSalioMal` i stället för att krascha UI:t. */
export function bookingFormErrorText(code: string): string {
  return KNOWN[code] ?? comun.algoSalioMal;
}
