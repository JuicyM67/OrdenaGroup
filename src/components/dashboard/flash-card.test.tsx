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
    // WP-47: el link "Compartir" (`/app/flash`, sin backend) se oculta.
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("activeFlash=null: muestra inicio.flashCard.vacio, sin link (WP-47)", () => {
    render(<FlashCard activeFlash={null} />);
    expect(screen.getByText(inicio.flashCard.vacio)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    // No debe quedar rastro del estado con datos (fecha/hora/descuento).
    expect(screen.queryByText(/−\d+%/)).not.toBeInTheDocument();
  });
});
