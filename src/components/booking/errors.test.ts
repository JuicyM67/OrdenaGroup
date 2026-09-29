import { describe, expect, it } from "vitest";

import { comun, errores, formulario } from "@/i18n";
import type { PhoneError } from "@/lib/format/phone";
import {
  ANSWER_LIMITS,
  type AnswerIssue,
  type BookingQuestionDef,
} from "@/lib/validation/booking-questions";

import {
  answerFieldError,
  answersToFieldErrors,
  fieldError,
  serverError,
  zodIssueToFieldError,
  type ClientFieldError,
} from "./errors";
import type { BookingServerErrorCode } from "./types";

const PHONE_CODES: readonly PhoneError[] = [
  "empty",
  "invalid_chars",
  "not_chilean",
  "invalid_length",
  "not_mobile",
  "invalid_prefix",
];

const SERVER_CODES: readonly BookingServerErrorCode[] = [
  "slot_taken",
  "too_soon",
  "too_far",
  "service_not_offered",
  "not_found",
  "invalid_status",
  "outside_cancel_window",
  "invalid_input",
  "outside_hours",
  "waitlist_duplicate",
  "network",
  "business_unavailable",
];

describe("fieldError", () => {
  it("tomt namn", () => {
    expect(fieldError({ field: "name", kind: "empty" })).toBe(
      errores.reserva.nombreVacio,
    );
  });

  it.each(PHONE_CODES)("telefono.%s har egen text", (kind) => {
    const issue: ClientFieldError = { field: "phone", kind };
    expect(fieldError(issue)).toBe(errores.reserva.telefono[kind]);
  });

  it("ogiltig e-post", () => {
    expect(fieldError({ field: "email", kind: "invalid" })).toBe(
      errores.reserva.emailInvalido,
    );
  });

  it("villkor krävs", () => {
    expect(fieldError({ field: "terms", kind: "required" })).toBe(
      errores.reserva.consentimientoRequerido,
    );
  });
});

describe("serverError", () => {
  it.each(SERVER_CODES)("%s har text", (code) => {
    expect(serverError(code)).toBe(errores.reserva[code]);
  });

  it("en okänd kod ger comun.algoSalioMal", () => {
    expect(serverError("unknown_code")).toBe(comun.algoSalioMal);
  });
});

describe("zodIssueToFieldError", () => {
  it("mappar zod-issue-meddelanden till fältfel", () => {
    expect(zodIssueToFieldError("name.empty")).toEqual({
      field: "name",
      kind: "empty",
    });
    expect(zodIssueToFieldError("phone.not_mobile")).toEqual({
      field: "phone",
      kind: "not_mobile",
    });
    expect(zodIssueToFieldError("email.invalid")).toEqual({
      field: "email",
      kind: "invalid",
    });
    expect(zodIssueToFieldError("terms.required")).toEqual({
      field: "terms",
      kind: "required",
    });
  });

  it("okänt fält/kod ger null", () => {
    expect(zodIssueToFieldError("unknown.thing")).toBeNull();
    expect(zodIssueToFieldError("no-dot")).toBeNull();
    expect(zodIssueToFieldError("phone.unknown_kind")).toBeNull();
  });
});

const SHORT_TEXT_Q: BookingQuestionDef = {
  id: "q1",
  label: "Alergias",
  help: null,
  kind: "short_text",
  options: null,
  required: false,
  saveToCustomer: false,
};

const LONG_TEXT_Q: BookingQuestionDef = { ...SHORT_TEXT_Q, kind: "long_text" };

describe("answerFieldError", () => {
  it("mappar varje kod till respuesta-texten", () => {
    expect(answerFieldError(SHORT_TEXT_Q, "required")).toBe(
      formulario.errores.respuesta.required,
    );
    expect(answerFieldError(SHORT_TEXT_Q, "invalid_option")).toBe(
      formulario.errores.respuesta.invalid_option,
    );
    expect(answerFieldError(SHORT_TEXT_Q, "duplicate_option")).toBe(
      formulario.errores.respuesta.duplicate_option,
    );
    expect(answerFieldError(SHORT_TEXT_Q, "invalid_number")).toBe(
      formulario.errores.respuesta.invalid_number,
    );
    expect(answerFieldError(SHORT_TEXT_Q, "invalid_date")).toBe(
      formulario.errores.respuesta.invalid_date,
    );
  });

  it("too_long använder shortText/longText beroende på frågans typ", () => {
    expect(answerFieldError(SHORT_TEXT_Q, "too_long")).toBe(
      formulario.errores.respuesta.too_long({ max: ANSWER_LIMITS.shortText }),
    );
    expect(answerFieldError(LONG_TEXT_Q, "too_long")).toBe(
      formulario.errores.respuesta.too_long({ max: ANSWER_LIMITS.longText }),
    );
  });

  it("invalid_type/unknown_question (programmeringsfel) faller tillbaka på required", () => {
    expect(answerFieldError(SHORT_TEXT_Q, "invalid_type")).toBe(
      formulario.errores.respuesta.required,
    );
    expect(answerFieldError(SHORT_TEXT_Q, "unknown_question")).toBe(
      formulario.errores.respuesta.required,
    );
  });
});

describe("answersToFieldErrors", () => {
  it("bygger { [questionId]: text } och hoppar över okända frågor", () => {
    const issues: AnswerIssue[] = [
      { questionId: "q1", code: "required" },
      { questionId: "missing", code: "required" },
      { questionId: null, code: "invalid_type" },
    ];
    expect(answersToFieldErrors([SHORT_TEXT_Q], issues)).toEqual({
      q1: formulario.errores.respuesta.required,
    });
  });
});
