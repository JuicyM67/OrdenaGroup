/**
 * Formaterar ett bokningssvar till text (WP-40, D-031) — delad av
 * `answers-list.tsx` (agenda/Hoy/kundkort) och `worker.ts`s motsvarighet
 * för ägarens mejl (egen kopia där, se filkommentaren i
 * `src/server/messaging/outbox/worker.ts`: mejlet kör i en annan
 * körtidskontext och importerar inte klientkomponenter). Ren funktion, ingen
 * databas, ingen klocka.
 */
import { formulario } from "@/i18n";
import { formatLocalDate, parseLocalDate } from "@/lib/format/dates";
import type {
  AnswerValue,
  QuestionKind,
} from "@/lib/validation/booking-questions";

/** "2 de octubre de 2026" — kalenderdatum utan tidszon (aldrig en tidpunkt,
 * se `booking-questions.ts`s filkommentar om `date`). */
function formatDateAnswer(value: string): string {
  const parsed = parseLocalDate(value);
  if (!parsed.ok) return value; // sparade svar är redan validerade (defensivt)
  const dayMonth = formatLocalDate(parsed.value, "dayMonthLong");
  return `${dayMonth} de ${value.slice(0, 4)}`;
}

/** Minsta gemensamma form för `BookingAnswerView`/`CustomerAnswerView`. */
export type FormattableAnswer = { kind: QuestionKind; value: AnswerValue };

export function formatAnswerValue(answer: FormattableAnswer): string {
  switch (answer.kind) {
    case "yes_no":
      return answer.value === true ? formulario.siNo.si : formulario.siNo.no;
    case "multi_choice":
      return Array.isArray(answer.value) ? answer.value.join(", ") : "";
    case "date":
      return typeof answer.value === "string"
        ? formatDateAnswer(answer.value)
        : String(answer.value);
    default:
      return String(answer.value);
  }
}
