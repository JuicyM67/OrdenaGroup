import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NextClientCard } from "./next-client-card";
import type { HoyBooking } from "./types";

const now = new Date("2026-10-02T14:40:00-03:00");

const booking: HoyBooking = {
  id: "joaquin",
  start: "2026-10-02T15:00:00-03:00",
  end: "2026-10-02T15:35:00-03:00",
  clientName: "Joaquín Rivas",
  service: "Corte + barba",
  staffId: "staff-1",
  staffName: "Diego",
  staffColor: 1,
  status: "confirmed",
  confirmedByCustomer: true,
  depositPaidClp: 0,
  source: "web",
  visitNumber: 3,
};

describe("NextClientCard", () => {
  it("Llegó anropar onArrived en gång vid dubbelklick, knapparna har höjden h-12", async () => {
    const user = userEvent.setup();
    const onArrived = vi.fn();
    render(
      <NextClientCard
        booking={booking}
        now={now}
        onArrived={onArrived}
        onNoShow={vi.fn()}
      />,
    );
    const llego = screen.getByRole("button", { name: "Llegó" });
    const noVino = screen.getByRole("button", { name: "No vino" });
    expect(llego.className).toContain("h-12");
    expect(noVino.className).toContain("h-12");

    await user.dblClick(llego);
    expect(onArrived).toHaveBeenCalledTimes(1);
  });

  it("disabled inaktiverar båda knapparna (optimistisk låsning)", async () => {
    const user = userEvent.setup();
    const onArrived = vi.fn();
    render(
      <NextClientCard
        booking={booking}
        now={now}
        onArrived={onArrived}
        onNoShow={vi.fn()}
        disabled
      />,
    );
    const llego = screen.getByRole("button", { name: "Llegó" });
    expect(llego).toBeDisabled();
    await user.click(llego);
    expect(onArrived).not.toHaveBeenCalled();
  });

  it('"sin-proxima" (booking undefined) saknar knappar', () => {
    render(
      <NextClientCard
        booking={undefined}
        now={now}
        onArrived={vi.fn()}
        onNoShow={vi.fn()}
      />,
    );
    expect(
      screen.getByText("No tienes más clientes agendados hoy."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it('emptyMessage byter ut standardtexten ("cerrado" motsäger inte listan)', () => {
    render(
      <NextClientCard
        booking={undefined}
        now={now}
        onArrived={vi.fn()}
        onNoShow={vi.fn()}
        emptyMessage="Hoy no atiendes."
      />,
    );
    expect(screen.getByText("Hoy no atiendes.")).toBeInTheDocument();
    expect(
      screen.queryByText("No tienes más clientes agendados hoy."),
    ).not.toBeInTheDocument();
  });

  it("visar tid, namn och statuschippen", () => {
    render(
      <NextClientCard
        booking={booking}
        now={now}
        onArrived={vi.fn()}
        onNoShow={vi.fn()}
      />,
    );
    expect(screen.getByText("15:00")).toBeInTheDocument();
    expect(screen.getByText("Joaquín Rivas")).toBeInTheDocument();
    expect(screen.getByText("Confirmó")).toBeInTheDocument();
  });
});
