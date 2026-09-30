import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { LocalDate } from "@/lib/format/dates";

import { HeroSummary } from "./hero-summary";
import type { InicioData } from "./types";

const features: InicioData["features"] = {
  waitlist: { count: 3, day: "2026-10-03" as LocalDate, progress: 0.6 },
  flash: { active: 2, booked: 1, progress: 0.5 },
  winback: { count: 12 },
};

describe("HeroSummary", () => {
  it('exactamente un elemento está resaltado en lime y contiene "4 horas · $72.000"', () => {
    render(
      <HeroSummary
        ownerFirstName="Camila"
        week={{ recoveredHours: 4, recoveredClp: 72_000 }}
        features={features}
      />,
    );
    const highlighted = screen.getByText("4 horas · $72.000");
    expect(highlighted.className).toContain("text-lime");

    // Es el único elemento con esa clase en todo el hero.
    const { container } = render(
      <HeroSummary
        ownerFirstName="Camila"
        week={{ recoveredHours: 4, recoveredClp: 72_000 }}
        features={features}
      />,
    );
    expect(container.getElementsByClassName("text-lime")).toHaveLength(1);
  });

  // WP-47: "Ver detalle" (`#detalle-semana`, ninguna sección con ese id existe) se oculta —
  // WP-xx: visas när funktionen finns.
  it('no queda ningún link "VER DETALLE" (WP-47, sin backend)', () => {
    render(
      <HeroSummary
        ownerFirstName="Camila"
        week={{ recoveredHours: 4, recoveredClp: 72_000 }}
        features={features}
      />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("el saludo usa ownerFirstName tal cual (ninguna formateo propio)", () => {
    render(
      <HeroSummary
        ownerFirstName="Camila"
        week={{ recoveredHours: 4, recoveredClp: 72_000 }}
        features={features}
      />,
    );
    expect(screen.getByText("Hola, Camila")).toBeInTheDocument();
  });

  it("semana vacía (0 horas): título vacío, sin resaltado lime", () => {
    render(
      <HeroSummary
        ownerFirstName="Camila"
        week={{ recoveredHours: 0, recoveredClp: 0 }}
        features={features}
      />,
    );
    const { container } = render(
      <HeroSummary
        ownerFirstName="Camila"
        week={{ recoveredHours: 0, recoveredClp: 0 }}
        features={features}
      />,
    );
    expect(container.getElementsByClassName("text-lime")).toHaveLength(0);
  });
});
