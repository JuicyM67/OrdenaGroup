/**
 * Svar på bokningsfrågor (WP-40 steg 3, D-031). Zod-schemat byggs från
 * serverns frågelista för vald tjänst — klientens lista litas aldrig på:
 * `createIn` (src/server/bookings/create.ts) laddar frågorna själv och
 * validerar med samma funktion. Filen är ren (ingen server-only, ingen klocka)
 * så att bokningsformuläret kan visa samma fältfel innan det skickar.
 *
 * Felkoder (`AnswerIssueCode`) är data, inte text: UI mappar dem via i18n.
 *
 * Tomma svar: `undefined`, `null`, en sträng med bara blanksteg och en tom
 * lista betyder "inte besvarad" (valfri fråga → utelämnas, obligatorisk →
 * `required`). `false` är ett riktigt svar på en ja/nej-fråga.
 *
 * `date` är ett kalenderdatum (`YYYY-MM-DD`) utan tidszon — aldrig en
 * tidpunkt. Det tolkas inte via `Date`, så sommartidsskiften i
 * `America/Santiago` kan inte flytta det.
 */
import { z } from "zod";

import { parseLocalDate } from "@/lib/format/dates";

export const QUESTION_KINDS = [
  "short_text",
  "long_text",
  "single_choice",
  "multi_choice",
  "number",
  "yes_no",
  "date",
] as const;

/** Samma namn som enumen `public.question_kind`. */
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export const ANSWER_LIMITS = {
  shortText: 200,
  longText: 1000,
  /** Heltal 0…numberMax (antal, ålder, storlek …). */
  numberMax: 1_000_000,
} as const;

/** Det som lagras i `booking_answers.value`/`customer_answers.value` (jsonb). */
export type AnswerValue = string | readonly string[] | number | boolean;

/** En fråga så som bokningsformuläret och valideringen ser den. */
export type BookingQuestionDef = {
  id: string;
  label: string;
  help: string | null;
  kind: QuestionKind;
  /** Bara för `single_choice`/`multi_choice`, annars null. */
  options: readonly string[] | null;
  required: boolean;
  saveToCustomer: boolean;
};

export type ValidatedAnswer = { questionId: string; value: AnswerValue };

export type AnswerIssueCode =
  | "required"
  | "invalid_type"
  | "too_long"
  | "invalid_option"
  | "duplicate_option"
  | "invalid_number"
  | "invalid_date"
  | "unknown_question";

/** `questionId` null = hela indatan (inte ett objekt). */
export type AnswerIssue = { questionId: string | null; code: AnswerIssueCode };

export type AnswersResult =
  { ok: true; value: ValidatedAnswer[] } | { ok: false; error: AnswerIssue[] };

function emptyToUndefined(v: unknown): unknown {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  if (Array.isArray(v) && v.length === 0) return undefined;
  return v;
}

/** Saknat värde → `required`, fel typ → `fallback`. */
function typeError(fallback: AnswerIssueCode) {
  return (iss: { input?: unknown }): AnswerIssueCode =>
    iss.input === undefined ? "required" : fallback;
}

function numberPreprocess(v: unknown): unknown {
  const e = emptyToUndefined(v);
  if (typeof e === "string" && /^\d+$/.test(e.trim())) return Number(e.trim());
  return e;
}

function valueSchema(q: BookingQuestionDef): z.ZodType<AnswerValue> {
  const options = q.options ?? [];
  switch (q.kind) {
    case "short_text":
    case "long_text":
      return z
        .string({ error: typeError("invalid_type") })
        .trim()
        .max(
          q.kind === "short_text"
            ? ANSWER_LIMITS.shortText
            : ANSWER_LIMITS.longText,
          { error: "too_long" },
        );
    case "single_choice":
      return z
        .string({ error: typeError("invalid_type") })
        .refine((v) => options.includes(v), { error: "invalid_option" });
    case "multi_choice":
      return z
        .array(z.string({ error: "invalid_type" }), {
          error: typeError("invalid_type"),
        })
        .refine((v) => new Set(v).size === v.length, {
          error: "duplicate_option",
          abort: true,
        })
        .refine((v) => v.every((x) => options.includes(x)), {
          error: "invalid_option",
        });
    case "number":
      return z
        .number({ error: typeError("invalid_number") })
        .int({ error: "invalid_number" })
        .min(0, { error: "invalid_number" })
        .max(ANSWER_LIMITS.numberMax, { error: "invalid_number" });
    case "yes_no":
      return z.boolean({ error: typeError("invalid_type") });
    case "date":
      return z
        .string({ error: typeError("invalid_date") })
        .refine((v) => parseLocalDate(v).ok, { error: "invalid_date" });
  }
}

function fieldSchema(
  q: BookingQuestionDef,
): z.ZodType<AnswerValue | undefined> {
  const inner = valueSchema(q);
  const pre = q.kind === "number" ? numberPreprocess : emptyToUndefined;
  return z.preprocess(pre, q.required ? inner : inner.optional());
}

/**
 * Zod-schema för `answers` (`Record<questionId, värde>`) byggt från
 * frågelistan. Okända nycklar avvisas (`unknown_question`), utdata är de
 * besvarade frågorna i frågelistans ordning. Issue-`message` är en
 * `AnswerIssueCode`, `path[0]` frågans id.
 */
export function buildAnswersSchema(
  questions: readonly BookingQuestionDef[],
): z.ZodType<ValidatedAnswer[], Record<string, unknown>> {
  const shape: Record<string, z.ZodType<AnswerValue | undefined>> = {};
  for (const q of questions) shape[q.id] = fieldSchema(q);
  return z.strictObject(shape, { error: "invalid_type" }).transform((obj) => {
    const out: ValidatedAnswer[] = [];
    for (const q of questions) {
      const value = (obj as Record<string, AnswerValue | undefined>)[q.id];
      if (value !== undefined) out.push({ questionId: q.id, value });
    }
    return out;
  }) as unknown as z.ZodType<ValidatedAnswer[], Record<string, unknown>>;
}

const KNOWN_CODES = new Set<string>([
  "required",
  "invalid_type",
  "too_long",
  "invalid_option",
  "duplicate_option",
  "invalid_number",
  "invalid_date",
  "unknown_question",
]);

/**
 * Validerar `raw` mot frågelistan. Ett fel per fråga (det första), i
 * frågelistans ordning; okända frågor sist.
 */
export function validateAnswers(
  questions: readonly BookingQuestionDef[],
  raw: unknown,
): AnswersResult {
  const input = raw === undefined || raw === null ? {} : raw;
  if (typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: [{ questionId: null, code: "invalid_type" }] };
  }
  const r = buildAnswersSchema(questions).safeParse(input);
  if (r.success) return { ok: true, value: r.data };

  const seen = new Set<string>();
  const found: AnswerIssue[] = [];
  for (const issue of r.error.issues) {
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) {
        if (seen.has(key)) continue;
        seen.add(key);
        found.push({ questionId: key, code: "unknown_question" });
      }
      continue;
    }
    const id = issue.path[0];
    if (typeof id !== "string") {
      return { ok: false, error: [{ questionId: null, code: "invalid_type" }] };
    }
    if (seen.has(id)) continue;
    seen.add(id);
    const code = KNOWN_CODES.has(issue.message)
      ? (issue.message as AnswerIssueCode)
      : "invalid_type";
    found.push({ questionId: id, code });
  }
  const order = new Map(questions.map((q, i) => [q.id, i]));
  const rank = (x: AnswerIssue) =>
    x.questionId !== null ? (order.get(x.questionId) ?? questions.length) : -1;
  found.sort((a, b) => rank(a) - rank(b));
  return { ok: false, error: found };
}
