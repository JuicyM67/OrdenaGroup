import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { inicio } from "@/i18n";

import { FlashCard } from "./flash-card";

describe("FlashCard", () => {
  it("con activeFlash: muestra fecha/hora/descuento", () => {
    render(
      <FlashCard
        activeFlash={{
          start: "2026-10-06T11:30:00-03:00",
          discountPct: 20,
          service: "Corte + barba",
          staff: "Diego",
        }}
      />,
    );
    expect(screen.getByText("Mar 6 · 11:30 · −20%")).toBeInTheDocument();
    // WP-23/WP-30: el link "Compartir" (`/app/flash`) vuelve a mostrarse.
    expect(screen.getByRole("link")).toHaveAttribute("href", "/app/flash");
  });

  it("activeFlash=null: muestra inicio.flashCard.vacio, con link a /app/flash", () => {
    render(<FlashCard activeFlash={null} />);
    expect(screen.getByText(inicio.flashCard.vacio)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/app/flash");
    // No debe quedar rastro del estado con datos (fecha/hora/descuento).
    expect(screen.queryByText(/−\d+%/)).not.toBeInTheDocument();
  });
});
