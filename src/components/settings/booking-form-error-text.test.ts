import { describe, expect, it } from "vitest";

import { comun, formulario, validacion } from "@/i18n";

import { bookingFormErrorText } from "./booking-form-error-text";

describe("bookingFormErrorText", () => {
  it("too_many_questions ger textkoden från formulario.errores", () => {
    expect(bookingFormErrorText("too_many_questions")).toBe(
      formulario.errores.too_many_questions,
    );
  });

  it("category.name_empty ger validacion.requerido", () => {
    expect(bookingFormErrorText("category.name_empty")).toBe(
      validacion.requerido,
    );
  });

  it("en okänd kod ger comun.algoSalioMal i stället för att krascha", () => {
    expect(bookingFormErrorText("something_new")).toBe(comun.algoSalioMal);
  });
});
