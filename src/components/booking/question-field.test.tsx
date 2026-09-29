import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { formulario } from "@/i18n";
import type { BookingQuestionDef } from "@/lib/validation/booking-questions";

import { QuestionField, type QuestionAnswerValue } from "./question-field";

function Harness({ question }: { question: BookingQuestionDef }) {
  const [value, setValue] = useState<QuestionAnswerValue>(undefined);
  return (
    <QuestionField
      question={question}
      value={value}
      onChange={setValue}
      registerRef={() => {}}
    />
  );
}

const base: Omit<BookingQuestionDef, "kind" | "options"> = {
  id: "q1",
  label: "Hårlängd",
  help: null,
  required: true,
  saveToCustomer: false,
};

describe("QuestionField", () => {
  it("short_text: renderiza un TextField con el label (marcado obligatorio)", () => {
    render(
      <Harness question={{ ...base, kind: "short_text", options: null }} />,
    );
    expect(screen.getByLabelText("Hårlängd *")).toBeInTheDocument();
  });

  it("long_text: renderiza un textarea", () => {
    render(
      <Harness question={{ ...base, kind: "long_text", options: null }} />,
    );
    const field = screen.getByLabelText("Hårlängd *");
    expect(field.tagName).toBe("TEXTAREA");
  });

  it("number: solo acepta dígitos", async () => {
    const user = userEvent.setup();
    render(<Harness question={{ ...base, kind: "number", options: null }} />);
    const input = screen.getByLabelText("Hårlängd *");
    await user.type(input, "a1b2");
    expect(input).toHaveValue("12");
  });

  it("date: renderiza un input type=date", () => {
    render(<Harness question={{ ...base, kind: "date", options: null }} />);
    expect(screen.getByLabelText("Hårlängd *")).toHaveAttribute("type", "date");
  });

  it("yes_no: dos pills, una sola seleccionada a la vez", async () => {
    const user = userEvent.setup();
    render(<Harness question={{ ...base, kind: "yes_no", options: null }} />);
    const si = screen.getByRole("button", { name: formulario.siNo.si });
    const no = screen.getByRole("button", { name: formulario.siNo.no });
    expect(si).toHaveAttribute("aria-pressed", "false");
    await user.click(si);
    expect(si).toHaveAttribute("aria-pressed", "true");
    expect(no).toHaveAttribute("aria-pressed", "false");
  });

  it("single_choice: elegir una opción deselecciona la anterior", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        question={{
          ...base,
          kind: "single_choice",
          options: ["Corto", "Mediano", "Largo"],
        }}
      />,
    );
    const corto = screen.getByRole("button", { name: "Corto" });
    const mediano = screen.getByRole("button", { name: "Mediano" });
    await user.click(corto);
    expect(corto).toHaveAttribute("aria-pressed", "true");
    await user.click(mediano);
    expect(mediano).toHaveAttribute("aria-pressed", "true");
    expect(corto).toHaveAttribute("aria-pressed", "false");
  });

  it("multi_choice: se pueden elegir varias opciones a la vez", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        question={{
          ...base,
          kind: "multi_choice",
          options: ["Rojo", "Azul"],
        }}
      />,
    );
    const rojo = screen.getByRole("button", { name: "Rojo" });
    const azul = screen.getByRole("button", { name: "Azul" });
    await user.click(rojo);
    await user.click(azul);
    expect(rojo).toHaveAttribute("aria-pressed", "true");
    expect(azul).toHaveAttribute("aria-pressed", "true");
  });

  it("muestra el texto de ayuda y el error cuando se pasan", () => {
    render(
      <QuestionField
        question={{
          ...base,
          kind: "short_text",
          options: null,
          help: "Ayuda visible",
        }}
        value={undefined}
        onChange={vi.fn()}
        error="Responde esta pregunta para reservar."
        registerRef={() => {}}
      />,
    );
    expect(screen.getByText("Ayuda visible")).toBeInTheDocument();
    expect(
      screen.getByText("Responde esta pregunta para reservar."),
    ).toBeInTheDocument();
  });
});
