import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renderar exakt en h1 och actions", () => {
    render(
      <PageHeader
        variant="desktop"
        title="Inicio"
        meta="Viernes 2 de octubre"
        actions={<button type="button">Buscar</button>}
      />,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Buscar" })).toBeInTheDocument();
  });

  it("mobile lägger meta före titeln i DOM-ordningen", () => {
    const { container } = render(
      <PageHeader variant="mobile" title="Hoy" meta="Viernes 2 de octubre" />,
    );
    const textNodes = Array.from(container.querySelectorAll("div, h1")).map(
      (el) => el.textContent,
    );
    const metaIndex = textNodes.indexOf("Viernes 2 de octubre");
    const titleIndex = textNodes.indexOf("Hoy");
    expect(metaIndex).toBeGreaterThanOrEqual(0);
    expect(metaIndex).toBeLessThan(titleIndex);
  });

  it("desktop lägger titeln före meta i DOM-ordningen", () => {
    const { container } = render(
      <PageHeader
        variant="desktop"
        title="Inicio"
        meta="Viernes 2 de octubre"
      />,
    );
    const h1 = container.querySelector("h1");
    const meta = screen.getByText("Viernes 2 de octubre");
    const position = h1 ? h1.compareDocumentPosition(meta) : 0;
    expect(Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });
});
