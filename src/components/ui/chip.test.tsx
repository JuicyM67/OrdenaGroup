import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Chip } from "./chip";

describe("Chip", () => {
  it("renderar texten som skickas in", () => {
    render(<Chip tone="success">Confirmada</Chip>);
    expect(screen.getByText("Confirmada")).toBeInTheDocument();
  });

  it('tone="tag" sätter versaler via klass, men behåller texten som den skickas in i DOM', () => {
    render(<Chip size="tag">Flash −20%</Chip>);
    const el = screen.getByText("Flash −20%");
    expect(el.textContent).toBe("Flash −20%");
    expect(el.className).toContain("uppercase");
  });
});
