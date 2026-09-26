import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MiniCalendar, type MiniCalendarLabels } from "./mini-calendar";

const weekdays = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"] as const;

const labels: MiniCalendarLabels = {
  title: "Octubre 2026",
  weekdays,
  prevMonth: "Mes anterior",
  nextMonth: "Mes siguiente",
  dayLabel: (date) => date,
};

describe("MiniCalendar", () => {
  it('vald dag har aria-pressed="true", idag har aria-current="date"', () => {
    render(
      <MiniCalendar
        month={{ year: 2026, month: 10 }}
        selected="2026-10-02"
        today="2026-10-05"
        variant="light"
        labels={labels}
      />,
    );
    expect(screen.getByRole("button", { name: "2026-10-02" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "2026-10-05" })).toHaveAttribute(
      "aria-current",
      "date",
    );
  });

  it("prick visas för markedDates i månaden, men inte på vald dag eller utanför månaden", () => {
    const { container } = render(
      <MiniCalendar
        month={{ year: 2026, month: 10 }}
        selected="2026-10-02"
        markedDates={new Set(["2026-10-03", "2026-10-02", "2026-09-29"])}
        variant="light"
        labels={labels}
      />,
    );
    const dotFor = (name: string) => {
      const button = screen.getByRole("button", { name });
      const cellWrapper = button.parentElement;
      return cellWrapper?.querySelector("span[aria-hidden='true']") ?? null;
    };
    expect(dotFor("2026-10-03")).not.toBeNull();
    expect(dotFor("2026-10-02")).toBeNull(); // vald dag
    expect(dotFor("2026-09-29")).toBeNull(); // utanför månaden
    expect(container.querySelectorAll("span.bg-violet")).toHaveLength(1);
  });

  it('onSelect("2026-10-15") vid klick', async () => {
    const onSelect = vi.fn();
    render(
      <MiniCalendar
        month={{ year: 2026, month: 10 }}
        variant="light"
        labels={labels}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "2026-10-15" }));
    expect(onSelect).toHaveBeenCalledWith("2026-10-15");
  });

  it("roving tabindex: exakt en dag har tabIndex 0", () => {
    render(
      <MiniCalendar
        month={{ year: 2026, month: 10 }}
        selected="2026-10-02"
        variant="light"
        labels={labels}
      />,
    );
    const grid = screen.getByRole("grid");
    const buttons = within(grid)
      .getAllByRole("button")
      .filter((b) => !b.hasAttribute("disabled"));
    const zeroTabIndex = buttons.filter((b) => b.tabIndex === 0);
    expect(zeroTabIndex).toHaveLength(1);
    expect(zeroTabIndex[0]).toHaveAccessibleName("2026-10-02");
  });

  it("ArrowRight från 31 okt anropar onNextMonth", async () => {
    const onNextMonth = vi.fn();
    render(
      <MiniCalendar
        month={{ year: 2026, month: 10 }}
        selected="2026-10-31"
        variant="light"
        labels={labels}
        onNextMonth={onNextMonth}
      />,
    );
    const day31 = screen.getByRole("button", { name: "2026-10-31" });
    day31.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onNextMonth).toHaveBeenCalledTimes(1);
  });

  it("dagar utanför månaden är disabled", () => {
    render(
      <MiniCalendar
        month={{ year: 2026, month: 10 }}
        variant="light"
        labels={labels}
      />,
    );
    expect(screen.getByRole("button", { name: "2026-09-28" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "2026-11-01" })).toBeDisabled();
  });

  it("mörk variant med highlightWeekOf markerar raden 28 sep–4 okt", () => {
    const { container } = render(
      <MiniCalendar
        month={{ year: 2026, month: 10 }}
        variant="dark"
        highlightWeekOf="2026-09-28"
        labels={labels}
      />,
    );
    const row = screen
      .getByRole("button", { name: "2026-09-28" })
      .closest("tr");
    expect(row?.className).toContain("bg-dark-2");
    const otherRow = screen
      .getByRole("button", { name: "2026-10-05" })
      .closest("tr");
    expect(otherRow?.className).not.toContain("bg-dark-2");
    expect(container).toBeTruthy();
  });
});
