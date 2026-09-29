import { describe, expect, it } from "vitest";

import {
  ANSWER_LIMITS,
  validateAnswers,
  type BookingQuestionDef,
} from "./booking-questions";
import { buildAnswersSchema } from "./booking-questions.schema";

let seq = 0;
function q(over: Partial<BookingQuestionDef> = {}): BookingQuestionDef {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    label: `Pregunta ${seq}`,
    help: null,
    kind: "short_text",
    options: null,
    required: false,
    saveToCustomer: false,
    ...over,
  };
}

function issues(qs: BookingQuestionDef[], raw: unknown) {
  const r = validateAnswers(qs, raw);
  return r.ok ? [] : r.error;
}

describe("validateAnswers: gemensamt", () => {
  it("tomt svar på valfria frågor ger en tom lista", () => {
    const qs = [q(), q({ kind: "yes_no" })];
    expect(validateAnswers(qs, {})).toEqual({ ok: true, value: [] });
    expect(validateAnswers(qs, undefined)).toEqual({ ok: true, value: [] });
  });

  it("obligatorisk fråga utan svar (saknas, null, tom sträng, blanksteg) → required", () => {
    const a = q({ required: true });
    for (const v of [undefined, null, "", "   "]) {
      expect(issues([a], v === undefined ? {} : { [a.id]: v })).toEqual([
        { questionId: a.id, code: "required" },
      ]);
    }
  });

  it("okänd fråga (t.ex. från ett annat företag eller en annan tjänst) → unknown_question", () => {
    const a = q();
    const foreign = "11111111-1111-4111-8111-111111111111";
    expect(issues([a], { [foreign]: "hola" })).toEqual([
      { questionId: foreign, code: "unknown_question" },
    ]);
  });

  it("indata som inte är ett objekt → invalid_type", () => {
    expect(issues([q()], ["x"])).toEqual([
      { questionId: null, code: "invalid_type" },
    ]);
    expect(issues([q()], "x")).toEqual([
      { questionId: null, code: "invalid_type" },
    ]);
  });

  it("utdata följer frågornas ordning, inte indatans", () => {
    const a = q();
    const b = q({ kind: "number" });
    const r = validateAnswers([a, b], { [b.id]: 3, [a.id]: " hola " });
    expect(r).toEqual({
      ok: true,
      value: [
        { questionId: a.id, value: "hola" },
        { questionId: b.id, value: 3 },
      ],
    });
  });

  it("buildAnswersSchema är ett Zod-schema med samma resultat", () => {
    const a = q({ required: true });
    const s = buildAnswersSchema([a]);
    expect(s.safeParse({ [a.id]: "x" }).success).toBe(true);
    const bad = s.safeParse({});
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]?.message).toBe("required");
    expect(bad.error?.issues[0]?.path).toEqual([a.id]);
  });
});

describe("validateAnswers: per typ", () => {
  it("short_text: trimmas, ≤ 200 tecken", () => {
    const a = q();
    const max = "a".repeat(ANSWER_LIMITS.shortText);
    expect(validateAnswers([a], { [a.id]: max }).ok).toBe(true);
    expect(issues([a], { [a.id]: `${max}a` })).toEqual([
      { questionId: a.id, code: "too_long" },
    ]);
    expect(issues([a], { [a.id]: 12 })).toEqual([
      { questionId: a.id, code: "invalid_type" },
    ]);
  });

  it("long_text: ≤ 1000 tecken", () => {
    const a = q({ kind: "long_text" });
    const max = "a".repeat(ANSWER_LIMITS.longText);
    expect(ANSWER_LIMITS.longText).toBe(1000);
    expect(validateAnswers([a], { [a.id]: max }).ok).toBe(true);
    expect(issues([a], { [a.id]: `${max}a` })).toEqual([
      { questionId: a.id, code: "too_long" },
    ]);
  });

  it("single_choice: bara ett av alternativen", () => {
    const a = q({ kind: "single_choice", options: ["Corto", "Largo"] });
    expect(validateAnswers([a], { [a.id]: "Largo" })).toEqual({
      ok: true,
      value: [{ questionId: a.id, value: "Largo" }],
    });
    expect(issues([a], { [a.id]: "Mediano" })).toEqual([
      { questionId: a.id, code: "invalid_option" },
    ]);
    expect(issues([a], { [a.id]: ["Largo"] })).toEqual([
      { questionId: a.id, code: "invalid_type" },
    ]);
  });

  it("multi_choice: delmängd, inga dubbletter, tom lista = inget svar", () => {
    const a = q({ kind: "multi_choice", options: ["A", "B", "C"] });
    expect(validateAnswers([a], { [a.id]: ["C", "A"] })).toEqual({
      ok: true,
      value: [{ questionId: a.id, value: ["C", "A"] }],
    });
    expect(issues([a], { [a.id]: ["A", "X"] })).toEqual([
      { questionId: a.id, code: "invalid_option" },
    ]);
    expect(issues([a], { [a.id]: ["A", "A"] })).toEqual([
      { questionId: a.id, code: "duplicate_option" },
    ]);
    expect(validateAnswers([a], { [a.id]: [] })).toEqual({
      ok: true,
      value: [],
    });
    const req = q({ kind: "multi_choice", options: ["A"], required: true });
    expect(issues([req], { [req.id]: [] })).toEqual([
      { questionId: req.id, code: "required" },
    ]);
  });

  it("number: heltal 0…max, siffersträng godtas, decimal/negativ avvisas", () => {
    const a = q({ kind: "number" });
    expect(validateAnswers([a], { [a.id]: 42 })).toEqual({
      ok: true,
      value: [{ questionId: a.id, value: 42 }],
    });
    expect(validateAnswers([a], { [a.id]: " 7 " })).toEqual({
      ok: true,
      value: [{ questionId: a.id, value: 7 }],
    });
    for (const v of [1.5, -1, "1,5", "abc", ANSWER_LIMITS.numberMax + 1, NaN]) {
      expect(issues([a], { [a.id]: v })).toEqual([
        { questionId: a.id, code: "invalid_number" },
      ]);
    }
  });

  it("yes_no: bara boolean, false är ett svar", () => {
    const a = q({ kind: "yes_no", required: true });
    expect(validateAnswers([a], { [a.id]: false })).toEqual({
      ok: true,
      value: [{ questionId: a.id, value: false }],
    });
    expect(issues([a], { [a.id]: "true" })).toEqual([
      { questionId: a.id, code: "invalid_type" },
    ]);
  });

  it("date: kalenderdatum YYYY-MM-DD, ogiltiga datum avvisas", () => {
    const a = q({ kind: "date" });
    expect(validateAnswers([a], { [a.id]: "2026-10-06" }).ok).toBe(true);
    for (const v of [
      "2026-02-30",
      "2026-13-01",
      "06-10-2026",
      "2026-10-06T00:00:00Z",
    ]) {
      expect(issues([a], { [a.id]: v })).toEqual([
        { questionId: a.id, code: "invalid_date" },
      ]);
    }
  });

  it("date kring sommartidsskiftet i Santiago lagras oförändrat som kalenderdatum", () => {
    // 2026-04-04 (första lördagen i april, klockan går bakåt) och 2026-09-05
    // (första lördagen i september, midnatt finns inte i America/Santiago).
    const a = q({ kind: "date" });
    for (const d of ["2026-04-04", "2026-04-05", "2026-09-05", "2026-09-06"]) {
      expect(validateAnswers([a], { [a.id]: d })).toEqual({
        ok: true,
        value: [{ questionId: a.id, value: d }],
      });
    }
  });

  it("flera fel rapporteras per fråga", () => {
    const a = q({ required: true });
    const b = q({ kind: "number" });
    expect(issues([a, b], { [b.id]: -3 })).toEqual([
      { questionId: a.id, code: "required" },
      { questionId: b.id, code: "invalid_number" },
    ]);
  });
});
