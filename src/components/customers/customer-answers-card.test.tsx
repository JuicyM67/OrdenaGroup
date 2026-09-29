import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { formulario } from "@/i18n";
import type { CustomerAnswersView } from "@/server/booking-questions/answers";

import { CustomerAnswersCard } from "./customer-answers-card";

describe("CustomerAnswersCard", () => {
  it("no renderiza nada sin respuestas", () => {
    const data: CustomerAnswersView = { latest: [], history: [] };
    const { container } = render(<CustomerAnswersCard data={data} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra los valores más recientes y la historia por reserva", () => {
    const data: CustomerAnswersView = {
      latest: [
        {
          questionId: "q1",
          label: "Alergias",
          kind: "short_text",
          value: "Ninguna",
          updatedAt: "2026-10-02T13:00:00.000Z",
        },
      ],
      history: [
        {
          bookingId: "b1",
          start: "2026-10-02T13:00:00.000Z",
          answers: [
            {
              questionId: "q1",
              label: "Alergias",
              kind: "short_text",
              value: "Ninguna",
            },
          ],
        },
      ],
    };
    render(<CustomerAnswersCard data={data} />);
    expect(screen.getAllByText(formulario.visualizacion.titulo)).toHaveLength(
      2,
    );
    expect(
      screen.getAllByText(
        formulario.visualizacion.par({
          etiqueta: "Alergias",
          valor: "Ninguna",
        }),
      ),
    ).toHaveLength(2);
  });
});
