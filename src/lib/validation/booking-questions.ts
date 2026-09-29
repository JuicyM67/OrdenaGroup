/**
 * Svar på bokningsfrågor (WP-40 steg 3, D-031). Valideringen byggs från
 * serverns frågelista för vald tjänst — klientens lista litas aldrig på:
 * `createIn` (src/server/bookings/create.ts) laddar frågorna själv och
 * validerar med samma funktion. Filen är ren (ingen server-only, ingen klocka)
 * så att bokningsformuläret kan visa samma fältfel innan det skickar.
 *
 * Ren TypeScript utan Zod: filen importeras av bokningsformuläret i klienten, och
 * Zod får inte hamna i klientbunten (JS-budget för /[slug], FRÅGA 7). Servern kan
 * använda `buildAnswersSchema` i `booking-questions.schema.ts` (Zod-omslag).
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

function preprocess(q: BookingQuestionDef, v: unknown): unknown {
  const e = emptyToUndefined(v);
  if (q.kind === "number" && typeof e === "string" && /^\d+$/.test(e.trim())) {
    return Number(e.trim());
  }
  return e;
}

type FieldResult =
  { ok: true; value: AnswerValue } | { ok: false; code: AnswerIssueCode };

function checkValue(q: BookingQuestionDef, v: unknown): FieldResult {
  const options = q.options ?? [];
  switch (q.kind) {
    case "short_text":
    case "long_text": {
      if (typeof v !== "string") return { ok: false, code: "invalid_type" };
      const t = v.trim();
      const max =
        q.kind === "short_text"
          ? ANSWER_LIMITS.shortText
          : ANSWER_LIMITS.longText;
      return t.length > max
        ? { ok: false, code: "too_long" }
        : { ok: true, value: t };
    }
    case "single_choice":
      if (typeof v !== "string") return { ok: false, code: "invalid_type" };
      return options.includes(v)
        ? { ok: true, value: v }
        : { ok: false, code: "invalid_option" };
    case "multi_choice": {
      if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) {
        return { ok: false, code: "invalid_type" };
      }
      const list = v as string[];
      if (new Set(list).size !== list.length) {
        return { ok: false, code: "duplicate_option" };
      }
      return list.every((x) => options.includes(x))
        ? { ok: true, value: list }
        : { ok: false, code: "invalid_option" };
    }
    case "number":
      return typeof v === "number" &&
        Number.isInteger(v) &&
        v >= 0 &&
        v <= ANSWER_LIMITS.numberMax
        ? { ok: true, value: v }
        : { ok: false, code: "invalid_number" };
    case "yes_no":
      return typeof v === "boolean"
        ? { ok: true, value: v }
        : { ok: false, code: "invalid_type" };
    case "date":
      return typeof v === "string" && parseLocalDate(v).ok
        ? { ok: true, value: v }
        : { ok: false, code: "invalid_date" };
  }
}

/**
 * Validerar `raw` (`Record<questionId, värde>`) mot frågelistan. Ett fel per
 * fråga, i frågelistans ordning; okända frågor (`unknown_question`) sist. Utdata
 * är de besvarade frågorna i frågelistans ordning.
 */
export function validateAnswers(
  questions: readonly BookingQuestionDef[],
  raw: unknown,
): AnswersResult {
  const input = raw === undefined || raw === null ? {} : raw;
  if (typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: [{ questionId: null, code: "invalid_type" }] };
  }
  const obj = input as Record<string, unknown>;
  const known = new Set(questions.map((q) => q.id));
  const errors: AnswerIssue[] = [];
  const out: ValidatedAnswer[] = [];
  for (const q of questions) {
    const v = preprocess(q, obj[q.id]);
    if (v === undefined) {
      if (q.required) errors.push({ questionId: q.id, code: "required" });
      continue;
    }
    const r = checkValue(q, v);
    if (r.ok) out.push({ questionId: q.id, value: r.value });
    else errors.push({ questionId: q.id, code: r.code });
  }
  for (const key of Object.keys(obj)) {
    if (!known.has(key))
      errors.push({ questionId: key, code: "unknown_question" });
  }
  return errors.length > 0
    ? { ok: false, error: errors }
    : { ok: true, value: out };
}
