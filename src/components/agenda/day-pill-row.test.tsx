import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { LocalDate } from "@/lib/format/dates";

import { DayPillRow } from "./day-pill-row";

const days = [
  "2026-09-28",
  "2026-09-29",
  "2026-09-30",
  "2026-10-01",
  "2026-10-02",
  "2026-10-03",
  "2026-10-04",
] as LocalDate[];

describe("DayPillRow", () => {
  it("idag har aria-current=date", () => {
    render(
      <DayPillRow
        days={days}
        today={"2026-10-02" as LocalDate}
        closedDates={new Set(["2026-10-04" as LocalDate])}
        gmtLabel="GMT−3"
        vista="semana"
        selectedDate={null}
        onSelectDay={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /vie2/i })).toHaveAttribute(
      "aria-current",
      "date",
    );
    expect(screen.getByRole("button", { name: /lun28/i })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("klick på en pill anropar onSelectDay (öppnar dagvyn från veckovyn)", async () => {
    const onSelectDay = vi.fn();
    render(
      <DayPillRow
        days={days}
        today={"2026-10-02" as LocalDate}
        closedDates={new Set()}
        gmtLabel="GMT−3"
        vista="semana"
        selectedDate={null}
        onSelectDay={onSelectDay}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /mar29/i }));
    expect(onSelectDay).toHaveBeenCalledWith("2026-09-29");
  });

  it("dagvy: aria-pressed bara på den valda dagen", () => {
    render(
      <DayPillRow
        days={days}
        today={"2026-10-02" as LocalDate}
        closedDates={new Set()}
        gmtLabel="GMT−3"
        vista="dia"
        selectedDate={"2026-09-30" as LocalDate}
        onSelectDay={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /mié30/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /vie2/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("veckovy: ingen dag är aria-pressed", () => {
    render(
      <DayPillRow
        days={days}
        today={"2026-10-02" as LocalDate}
        closedDates={new Set()}
        gmtLabel="GMT−3"
        vista="semana"
        selectedDate={"2026-09-30" as LocalDate}
        onSelectDay={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      expect(btn).toHaveAttribute("aria-pressed", "false");
    }
  });
});
