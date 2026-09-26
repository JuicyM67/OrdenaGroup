import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Pill } from "./pill";

describe("Pill", () => {
  it("aria-pressed följer selected", () => {
    const { rerender } = render(<Pill selected={false}>Diego</Pill>);
    expect(screen.getByRole("button", { name: "Diego" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    rerender(<Pill selected={true}>Diego</Pill>);
    expect(screen.getByRole("button", { name: "Diego" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("klick anropar onClick", async () => {
    const onClick = vi.fn();
    render(
      <Pill selected={false} onClick={onClick}>
        Matías
      </Pill>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Matías" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("tangentbord (Enter/Space) fungerar", async () => {
    const onClick = vi.fn();
    render(
      <Pill selected={false} onClick={onClick}>
        Tomás
      </Pill>,
    );
    const el = screen.getByRole("button", { name: "Tomás" });
    el.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
