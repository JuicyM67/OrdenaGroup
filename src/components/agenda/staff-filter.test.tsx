import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AgendaStaff } from "./types";
import { StaffFilter } from "./staff-filter";

const staff: readonly AgendaStaff[] = [
  { id: "staff-1", name: "Diego", initials: "DI", color: 1 },
  { id: "staff-2", name: "Matías", initials: "MA", color: 2 },
  { id: "staff-3", name: "Tomás", initials: "TO", color: 3 },
];

const counts = { "staff-1": 21, "staff-2": 17, "staff-3": 15 };

describe("StaffFilter", () => {
  it("kryssa ur Matías: onToggle('staff-2') anropas (vecka och dag filtreras av agenda-screen)", async () => {
    const onToggle = vi.fn();
    render(
      <StaffFilter
        staff={staff}
        visibleStaffIds={new Set(["staff-1", "staff-2", "staff-3"])}
        counts={counts}
        onToggle={onToggle}
      />,
    );
    await userEvent.click(screen.getByRole("checkbox", { name: /matías/i }));
    expect(onToggle).toHaveBeenCalledWith("staff-2");
  });

  it("den sista ikryssade kan inte kryssas ur", async () => {
    const onToggle = vi.fn();
    render(
      <StaffFilter
        staff={staff}
        visibleStaffIds={new Set(["staff-1"])}
        counts={counts}
        onToggle={onToggle}
      />,
    );
    const checkbox = screen.getByRole("checkbox", { name: /diego/i });
    expect(checkbox).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(checkbox, { pointerEventsCheck: 0 });
    expect(onToggle).not.toHaveBeenCalled();
    expect(checkbox).toBeChecked();
  });

  it("reservasCount visas per profesional", () => {
    render(
      <StaffFilter
        staff={staff}
        visibleStaffIds={new Set(["staff-1", "staff-2", "staff-3"])}
        counts={counts}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText("21 reservas")).toBeInTheDocument();
    expect(screen.getByText("17 reservas")).toBeInTheDocument();
    expect(screen.getByText("15 reservas")).toBeInTheDocument();
  });
});
