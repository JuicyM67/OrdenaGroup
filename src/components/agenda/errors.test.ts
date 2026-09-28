import { describe, expect, it } from "vitest";

import { errores } from "@/i18n";
import type { PhoneError } from "@/lib/format/phone";

import { agendaServerError, manualFieldError } from "./errors";

const PHONE_CODES: readonly PhoneError[] = [
  "empty",
  "invalid_chars",
  "not_chilean",
  "invalid_length",
  "not_mobile",
  "invalid_prefix",
];

// Samma koder som `BookingError` (src/server/bookings/types.ts) — dupliceras
// här som strängar (inte importerade, för att undvika att dra in
// "server-only" i testfilen, samma mönster som booking/errors.test.ts).
const SERVER_CODES = [
  "slot_taken",
  "too_soon",
  "too_far",
  "service_not_offered",
  "not_found",
  "invalid_status",
  "outside_cancel_window",
  "invalid_input",
  "outside_hours",
  "business_unavailable",
] as const;

describe("manualFieldError", () => {
  it("tomt namn återanvänder errores.reserva.nombreVacio", () => {
    expect(manualFieldError({ field: "name", kind: "empty" })).toBe(
      errores.reserva.nombreVacio,
    );
  });

  it.each(PHONE_CODES)(
    "telefono.%s återanvänder errores.reserva.telefono",
    (kind) => {
      expect(manualFieldError({ field: "phone", kind })).toBe(
        errores.reserva.telefono[kind],
      );
    },
  );

  it("ogiltig e-post återanvänder errores.reserva.emailInvalido", () => {
    expect(manualFieldError({ field: "email", kind: "invalid" })).toBe(
      errores.reserva.emailInvalido,
    );
  });

  it("servicio/staff/date/time ger errores.agenda.invalid_input", () => {
    expect(manualFieldError({ field: "service", kind: "empty" })).toBe(
      errores.agenda.invalid_input,
    );
    expect(manualFieldError({ field: "staff", kind: "empty" })).toBe(
      errores.agenda.invalid_input,
    );
    expect(manualFieldError({ field: "date", kind: "empty" })).toBe(
      errores.agenda.invalid_input,
    );
    expect(manualFieldError({ field: "time", kind: "empty" })).toBe(
      errores.agenda.invalid_input,
    );
  });
});

describe("agendaServerError", () => {
  it.each(SERVER_CODES)("%s har text i errores.agenda", (code) => {
    expect(agendaServerError(code)).toBe(errores.agenda[code]);
  });

  it("en okänd kod ger errores.agenda.network", () => {
    expect(agendaServerError("unknown_code")).toBe(errores.agenda.network);
  });
});
