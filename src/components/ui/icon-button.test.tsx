import { Bell } from "lucide-react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IconButton } from "./icon-button";

describe("IconButton", () => {
  it("sätter aria-label från label-prop", () => {
    render(
      <IconButton label="Notificaciones">
        <Bell aria-hidden="true" />
      </IconButton>,
    );
    expect(
      screen.getByRole("button", { name: "Notificaciones" }),
    ).toBeInTheDocument();
  });

  it("badge-pricken är aria-hidden", () => {
    render(
      <IconButton label="Notificaciones (nuevas)" badge>
        <Bell aria-hidden="true" />
      </IconButton>,
    );
    const button = screen.getByRole("button", {
      name: "Notificaciones (nuevas)",
    });
    const badge = button.querySelector("span[aria-hidden='true']");
    expect(badge).not.toBeNull();
  });

  it('asChild (Radix Slot) med <a href> ger en länk med aria-label ("Compartir hora flash")', () => {
    render(
      <IconButton asChild label="Compartir hora flash" tone="surface">
        <a href="/app/flash">
          <Bell aria-hidden="true" />
        </a>
      </IconButton>,
    );
    const link = screen.getByRole("link", { name: "Compartir hora flash" });
    expect(link).toHaveAttribute("href", "/app/flash");
    // Stilen (bg-surface, size-11 …) kommer från IconButton, inte från barnet.
    expect(link.className).toContain("bg-surface");
  });

  // @ts-expect-error label är obligatorisk i typen (fångas av typecheck).
  it("ger typfel utan label", () => <IconButton />);
});
