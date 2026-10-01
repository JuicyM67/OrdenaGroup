import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MainNav } from "./main-nav";

describe("MainNav", () => {
  it("bara Inicio har aria-current=page; 8 enlaces (logo + 7 rutas) con nombre accesible", () => {
    render(<MainNav active="inicio" />);

    // WP-57: Hoy se agrega entre Agenda y Clientes — logo (/app/inicio), Inicio,
    // Agenda, Hoy, Clientes, Horas flash, Caja, Ajustes.
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(8);
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

  it('"Cerrar sesión" es un botón de formulario (WP-47), no un link', () => {
    render(<MainNav active="inicio" />);
    expect(
      screen.getByRole("button", { name: "Cerrar sesión" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Cerrar sesión" }),
    ).not.toBeInTheDocument();
  });
});
