import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RestOfDay } from "./rest-of-day";
import type { HoyBooking } from "./types";

const rows: HoyBooking[] = [
  {
    id: "valentina",
    start: "2026-10-02T15:45:00-03:00",
    end: "2026-10-02T16:15:00-03:00",
    clientName: "Valentina Soto",
    service: "Corte clásico",
    staffName: "Matías",
    staffColor: 2,
    status: "confirmed",
    confirmedByCustomer: false,
    depositPaidClp: 8000,
    source: "web",
    visitNumber: 1,
  },
];

describe("RestOfDay", () => {
  it("resumen använder dayCount/dayTotalClp ur datan, inte summan av raderna", () => {
    render(
      <RestOfDay
        bookings={rows}
        dayCount={6}
        dayTotalClp={84_000}
        closedToday={false}
      />,
    );
    expect(screen.getByText("6 reservas · $84.000")).toBeInTheDocument();
  });

  it("diaCerrado ersätter listan när closedToday är sant", () => {
    render(
      <RestOfDay bookings={[]} dayCount={0} dayTotalClp={0} closedToday />,
    );
    expect(screen.getByText("Hoy no atiendes.")).toBeInTheDocument();
  });

  it("vacio visas när det inte finns några rader och dagen inte är stängd", () => {
    render(
      <RestOfDay
        bookings={[]}
        dayCount={0}
        dayTotalClp={0}
        closedToday={false}
      />,
    );
    expect(screen.getByText("No tienes más reservas hoy.")).toBeInTheDocument();
  });

  it("varje rad visar tid, klient, detalj och eventuell tagg (Abono)", () => {
    render(
      <RestOfDay
        bookings={rows}
        dayCount={6}
        dayTotalClp={84_000}
        closedToday={false}
      />,
    );
    expect(screen.getByText("15:45")).toBeInTheDocument();
    expect(screen.getByText("Valentina Soto")).toBeInTheDocument();
    expect(screen.getByText("Corte clásico · Matías")).toBeInTheDocument();
    expect(screen.getByText("Abono")).toBeInTheDocument();
  });
});
