import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { LocalDate } from "@/lib/format/dates";
import { reserva } from "@/i18n";

import { DayButton } from "./day-button";

const SAT = "2026-10-03" as LocalDate;

describe("DayButton", () => {
  it("full dag har dold text och pricken är aria-hidden", () => {
    render(
      <DayButton
        date={SAT}
        selected={false}
        full
        flash={false}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText(reserva.dia.llenoOculto)).toBeInTheDocument();
    const dot = document.querySelector('[aria-hidden="true"].rounded-full');
    expect(dot).not.toBeNull();
  });

  it("visar antalet dagen i siffror, oberoende av TZ", () => {
    process.env.TZ = "UTC";
    render(
      <DayButton
        date={SAT}
        selected={false}
        full={false}
        flash={false}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("3")).toBeInTheDocument();
    delete process.env.TZ;
  });

  it("aria-pressed följer selected", () => {
    render(
      <DayButton
        date={SAT}
        selected={true}
        full={false}
        flash={false}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });
});
