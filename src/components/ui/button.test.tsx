import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it('renderar <button type="button"> som standard', () => {
    render(<Button>Reservar</Button>);
    const el = screen.getByRole("button", { name: "Reservar" });
    expect(el.tagName).toBe("BUTTON");
    expect(el).toHaveAttribute("type", "button");
  });

  it("asChild renderar en länk med samma klasser", () => {
    render(
      <Button asChild variant="accent">
        <a href="/reservar">Reservar</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Reservar" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/reservar");
    expect(link.className).toContain("bg-lime");
  });

  it("disabled förhindrar klick", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        No disponible
      </Button>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "No disponible" }),
    );
    expect(onClick).not.toHaveBeenCalled();
  });

  it('variant="accent" ger bg-lime', () => {
    render(<Button variant="accent">Llegó</Button>);
    expect(screen.getByRole("button", { name: "Llegó" }).className).toContain(
      "bg-lime",
    );
  });
});
