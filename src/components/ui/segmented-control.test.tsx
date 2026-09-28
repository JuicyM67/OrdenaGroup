import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "./segmented-control";

const options = [
  { value: "month", label: "Mes" },
  { value: "week", label: "Semana" },
  { value: "day", label: "Día" },
];

describe("SegmentedControl", () => {
  it("kontrollerad: visar det valda alternativet", () => {
    render(
      <SegmentedControl
        aria-label="Vista"
        value="week"
        onValueChange={vi.fn()}
        options={options}
      />,
    );
    expect(screen.getByRole("radio", { name: "Semana" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Mes" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("piltangent flyttar fokus mellan knapparna", async () => {
    render(
      <SegmentedControl
        aria-label="Vista"
        value="week"
        onValueChange={vi.fn()}
        options={options}
      />,
    );
    screen.getByRole("radio", { name: "Semana" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Día" })).toHaveFocus();
  });

  it("val anropar onValueChange", async () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl
        aria-label="Vista"
        value="week"
        onValueChange={onValueChange}
        options={options}
      />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "Día" }));
    expect(onValueChange).toHaveBeenCalledWith("day");
  });

  it("ett disabled alternativ går inte att välja och hoppas över av piltangenterna", async () => {
    const onValueChange = vi.fn();
    const withDisabled = [
      { value: "month", label: "Mes", disabled: true },
      { value: "week", label: "Semana" },
      { value: "day", label: "Día" },
    ];
    render(
      <SegmentedControl
        aria-label="Vista"
        value="week"
        onValueChange={onValueChange}
        options={withDisabled}
      />,
    );
    const month = screen.getByRole("radio", { name: "Mes" });
    expect(month).toBeDisabled();
    await userEvent.click(month, { pointerEventsCheck: 0 });
    expect(onValueChange).not.toHaveBeenCalled();

    screen.getByRole("radio", { name: "Día" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    // Runt om Día: Mes är disabled, så piltangenten hoppar tillbaka till Semana.
    expect(screen.getByRole("radio", { name: "Semana" })).toHaveFocus();
  });

  it("vald knapp kan inte avmarkeras (värdet blir aldrig tomt)", async () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl
        aria-label="Vista"
        value="week"
        onValueChange={onValueChange}
        options={options}
      />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "Semana" }));
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
