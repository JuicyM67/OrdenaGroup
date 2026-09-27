import { describe, expect, it } from "vitest";

import { comun, errores } from "@/i18n";
import type { PhoneError } from "@/lib/format/phone";

import {
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
