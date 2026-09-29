import { describe, expect, it } from "vitest";

import { formulario } from "@/i18n";

import { formatAnswerValue } from "./answer-format";

describe("formatAnswerValue", () => {
  it("yes_no → sí/no", () => {
    expect(formatAnswerValue({ kind: "yes_no", value: true })).toBe(
      formulario.siNo.si,
    );
    expect(formatAnswerValue({ kind: "yes_no", value: false })).toBe(
      formulario.siNo.no,
    );
  });

  it("multi_choice → lista separada por comas", () => {
    expect(
      formatAnswerValue({ kind: "multi_choice", value: ["Rojo", "Azul"] }),
    ).toBe("Rojo, Azul");
  });

  it("multi_choice vacía → cadena vacía", () => {
    expect(formatAnswerValue({ kind: "multi_choice", value: [] })).toBe("");
  });

  it("date → fecha en español, sin desfase de zona horaria", () => {
    expect(formatAnswerValue({ kind: "date", value: "2026-01-05" })).toBe(
      "5 de enero de 2026",
    );
  });

  it("short_text/number/single_choice → el valor tal cual", () => {
    expect(
      formatAnswerValue({ kind: "short_text", value: "Sin alergias" }),
    ).toBe("Sin alergias");
    expect(formatAnswerValue({ kind: "number", value: 3 })).toBe("3");
    expect(formatAnswerValue({ kind: "single_choice", value: "Mediano" })).toBe(
      "Mediano",
    );
  });
});
