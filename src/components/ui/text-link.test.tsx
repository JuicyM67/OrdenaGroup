import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TextLink } from "./text-link";

describe("TextLink", () => {
  it('renderar en riktig länk med rätt href ("Ver agenda")', () => {
    render(<TextLink href="/app/agenda">Ver agenda</TextLink>);
    const link = screen.getByRole("link", { name: "Ver agenda" });
    expect(link).toHaveAttribute("href", "/app/agenda");
  });

  it("har text-13, font-semibold, underline och fokusring", () => {
    render(<TextLink href="/app/agenda">Ver agenda</TextLink>);
    const link = screen.getByRole("link", { name: "Ver agenda" });
    expect(link.className).toContain("text-13");
    expect(link.className).toContain("font-semibold");
    expect(link.className).toContain("underline");
    expect(link.className).toContain("focus-visible:outline-ink");
    expect(link.className).toContain("focus-visible:transition-none");
  });
});
