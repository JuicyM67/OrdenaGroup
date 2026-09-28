import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MainNav } from "./main-nav";

describe("MainNav", () => {
  it("bara Inicio har aria-current=page, y hay 7 enlaces con nombre accesible", () => {
    render(<MainNav active="inicio" />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(7);
    for (const link of links) {
      expect(link).toHaveAccessibleName();
    }

    const current = links.filter(
      (l) => l.getAttribute("aria-current") === "page",
    );
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName("Inicio");
  });

  it("otra pestaña activa (Agenda) mueve aria-current", () => {
    render(<MainNav active="agenda" />);
    const current = screen
      .getAllByRole("link")
      .filter((l) => l.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName("Agenda");
  });
});
