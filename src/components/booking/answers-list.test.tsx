import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { formulario } from "@/i18n";

import { AnswersList, type DisplayAnswer } from "./answers-list";

const answers: DisplayAnswer[] = [
  { questionId: "q1", label: "Hårlängd", kind: "single_choice", value: "Kort" },
  { questionId: "q2", label: "¿Alergias?", kind: "yes_no", value: false },
];

describe("AnswersList", () => {
  it("no renderiza nada si no hay respuestas", () => {
    const { container } = render(<AnswersList answers={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el título y una línea 'etiqueta: valor' por respuesta", () => {
    render(<AnswersList answers={answers} />);
    expect(
      screen.getByText(formulario.visualizacion.titulo),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        formulario.visualizacion.par({ etiqueta: "Hårlängd", valor: "Kort" }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        formulario.visualizacion.par({
          etiqueta: "¿Alergias?",
          valor: formulario.siNo.no,
        }),
      ),
    ).toBeInTheDocument();
  });
});
