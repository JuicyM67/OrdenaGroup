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

  // @ts-expect-error label är obligatorisk i typen (fångas av typecheck).
  it("ger typfel utan label", () => <IconButton />);
});
