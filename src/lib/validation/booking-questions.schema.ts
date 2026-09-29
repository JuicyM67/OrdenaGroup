import "server-only";

/**
 * Zod-omslag runt `validateAnswers` för serverkod som vill ha ett Zod-schema.
 * Egen fil så att Zod aldrig hamnar i klientbunten (se booking-questions.ts).
 */
import { z } from "zod";

import {
  type BookingQuestionDef,
  type ValidatedAnswer,
  validateAnswers,
} from "./booking-questions";

/** Issue-`message` är en `AnswerIssueCode`, `path[0]` frågans id. */
export function buildAnswersSchema(
  questions: readonly BookingQuestionDef[],
): z.ZodType<ValidatedAnswer[], unknown> {
  return z.unknown().transform((raw, ctx) => {
    const r = validateAnswers(questions, raw);
    if (r.ok) return r.value;
    for (const e of r.error) {
      ctx.addIssue({
        code: "custom",
        message: e.code,
        path: e.questionId === null ? [] : [e.questionId],
      });
    }
    return z.NEVER;
  });
}
