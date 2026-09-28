import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TextField } from "./text-field";

describe("TextField", () => {
  it("etiketten är kopplad till fältet (label/for)", () => {
    render(<TextField label="Nombre" placeholder="Tu nombre" />);
    const input = screen.getByLabelText("Nombre");
    expect(input).toBeInstanceOf(HTMLInputElement);
  });

  it("aria-invalid och aria-describedby innehåller både hint och fel", () => {
    render(
      <TextField
        label="Correo (opcional)"
        hint="Te lo pedimos por si el mensaje de WhatsApp no llega."
        error="Revisa tu correo electrónico."
      />,
    );
    const input = screen.getByLabelText("Correo (opcional)");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const ids = describedBy!.split(" ");
    expect(ids).toHaveLength(2);
    for (const id of ids) {
      expect(document.getElementById(id)).not.toBeNull();
    }
    expect(
      screen.getByText("Te lo pedimos por si el mensaje de WhatsApp no llega."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Revisa tu correo electrónico."),
    ).toBeInTheDocument();
  });

  it("utan fel: aria-invalid är false och ingen felrad", () => {
    render(<TextField label="Nombre" />);
    const input = screen.getByLabelText("Nombre");
    expect(input).toHaveAttribute("aria-invalid", "false");
  });
});
