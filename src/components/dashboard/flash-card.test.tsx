import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { hoy, inicio } from "@/i18n";

import { FlashCard } from "./flash-card";

describe("FlashCard", () => {
  it("con activeFlash: muestra fecha/hora/descuento y el link Compartir hora flash", () => {
    render(
      <FlashCard
        href="/app/flash"
        activeFlash={{
          start: "2026-10-06T11:30:00-03:00",
          discountPct: 20,
          service: "Corte + barba",
          staff: "Diego",
        }}
      />,
    );
    expect(screen.getByText("Mar 6 · 11:30 · −20%")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: inicio.flashCard.compartir }),
    ).toHaveAttribute("href", "/app/flash");
  });

  it("activeFlash=null: muestra inicio.flashCard.vacio y un link para crear una", () => {
    render(<FlashCard href="/app/flash" activeFlash={null} />);
    expect(screen.getByText(inicio.flashCard.vacio)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: hoy.accionesRapidas.crearHoraFlash }),
    ).toHaveAttribute("href", "/app/flash");
    // No debe quedar rastro del estado con datos (fecha/hora/descuento).
    expect(screen.queryByText(/−\d+%/)).not.toBeInTheDocument();
  });
});
