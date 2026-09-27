import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AgendaRow } from "./agenda-row";
import type { TodayBooking } from "./types";

function booking(overrides: Partial<TodayBooking> = {}): TodayBooking {
  return {
    id: "b1",
    start: "2026-10-02T15:00:00-03:00",
    end: "2026-10-02T15:45:00-03:00",
    clientName: "Joaquín Rivas",
    initials: "JR",
    service: "Corte + barba",
    staff: "Diego",
    tint: "lilac-100",
    status: "confirmed",
    depositPaid: false,
    confirmedByCustomer: true,
    ...overrides,
  };
}

describe("AgendaRow", () => {
  it("muestra la hora en America/Santiago aunque TZ del proceso sea otro (Europe/Stockholm)", () => {
    const original = process.env.TZ;
    process.env.TZ = "Europe/Stockholm";
    try {
      render(
        <ul>
          <AgendaRow booking={booking()} />
        </ul>,
      );
      expect(screen.getByText("15:00")).toBeInTheDocument();
    } finally {
      process.env.TZ = original;
    }
  });

  it("confirmedByCustomer=true, depositPaid=false → chip Confirmada", () => {
    render(
      <ul>
        <AgendaRow booking={booking()} />
      </ul>,
    );
    expect(screen.getByText("Confirmada")).toBeInTheDocument();
  });

  it("depositPaid=true → chip Abono pagado (gana sobre confirmedByCustomer)", () => {
    render(
      <ul>
        <AgendaRow
          booking={booking({ depositPaid: true, confirmedByCustomer: true })}
        />
      </ul>,
    );
    expect(screen.getByText("Abono pagado")).toBeInTheDocument();
  });

  it("ninguno de los dos → chip Sin confirmar", () => {
    render(
      <ul>
        <AgendaRow
          booking={booking({
            depositPaid: false,
            confirmedByCustomer: false,
          })}
        />
      </ul>,
    );
    expect(screen.getByText("Sin confirmar")).toBeInTheDocument();
  });

  it('es un <li> con avatar (iniciales) y el botón "Más opciones"', () => {
    render(
      <ul>
        <AgendaRow booking={booking()} />
      </ul>,
    );
    expect(screen.getByRole("listitem")).toBeInTheDocument();
    expect(screen.getByText("JR")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Más opciones" }),
    ).toBeInTheDocument();
  });
});
