import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { HoyScreen } from "./hoy-screen";
import type { HoyData } from "./types";

function makeData(): HoyData {
  return {
    now: "2026-10-02T14:40:00-03:00",
    owner: { name: "Camila Rojas" },
    closedToday: false,
    bookings: [
      {
        id: "a",
        start: "2026-10-02T15:00:00-03:00",
        end: "2026-10-02T15:10:00-03:00",
        clientName: "Cliente A",
        service: "Corte",
        staffName: "Diego",
        staffColor: 1,
        status: "confirmed",
        confirmedByCustomer: true,
        depositPaidClp: 0,
        source: "web",
        visitNumber: 1,
      },
      {
        id: "b",
        start: "2026-10-02T15:20:00-03:00",
        end: "2026-10-02T15:30:00-03:00",
        clientName: "Cliente B",
        service: "Corte",
        staffName: "Diego",
        staffColor: 1,
        status: "confirmed",
        confirmedByCustomer: true,
        depositPaidClp: 0,
        source: "web",
        visitNumber: 1,
      },
    ],
    dayCount: 2,
    dayTotalClp: 20_000,
    waitlistCount: 0,
    unreadNotifications: 0,
    links: {
      flash: "/app/horas-flash/nueva",
      waitlist: "/app/lista-de-espera",
      cobrar: "/app/caja/cobrar",
      tabs: {
        hoy: "/app/hoy",
        agenda: "/app/agenda",
        clientes: "/app/clientes",
        caja: "/app/caja",
      },
    },
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("HoyScreen", () => {
  it("notispricken visas bara när unreadNotifications > 0, med rätt aria-label", () => {
    const { rerender } = render(
      <HoyScreen data={{ ...makeData(), unreadNotifications: 0 }} />,
    );
    const button = screen.getByRole("button", { name: "Notificaciones" });
    expect(button.querySelector('[aria-hidden="true"].bg-alert')).toBeNull();

    rerender(<HoyScreen data={{ ...makeData(), unreadNotifications: 2 }} />);
    const buttonUnread = screen.getByRole("button", {
      name: "2 notificaciones nuevas",
    });
    expect(
      buttonUnread.querySelector('[aria-hidden="true"].bg-alert'),
    ).not.toBeNull();
  });

  it("samma annonstext i rad (två gånger No vino) läses upp igen — ny nod i role=status", async () => {
    const user = userEvent.setup();
    render(<HoyScreen data={makeData()} />);

    const status = document.querySelector('[role="status"]')!;

    await user.click(screen.getByRole("button", { name: "No vino" }));
    const firstSpan = status.querySelector("span");
    expect(firstSpan?.textContent).toBe("Marcado como No vino.");

    // Vänta ut den optimistiska låsningen (OPTIMISTIC_LOCK_MS) innan nästa tryck.
    await wait(450);

    await user.click(screen.getByRole("button", { name: "No vino" }));
    const secondSpan = status.querySelector("span");
    expect(secondSpan?.textContent).toBe("Marcado como No vino.");
    expect(secondSpan).not.toBe(firstSpan);
  });

  it("stängd dag: nästa-kund-kortet visar hoy.restoDia.diaCerrado, inte hoy.sinProximaReserva", () => {
    render(<HoyScreen data={{ ...makeData(), closedToday: true }} />);
    const card = screen.getByRole("region", { name: "Próxima reserva" });
    expect(within(card).getByText("Hoy no atiendes.")).toBeInTheDocument();
    expect(
      screen.queryByText("No tienes más clientes agendados hoy."),
    ).not.toBeInTheDocument();
    // Listan under visar samma text — det är avsiktligt (samma budskap på två ställen),
    // inte en motsägelse (granskningsfynd #7).
    expect(screen.getAllByText("Hoy no atiendes.")).toHaveLength(2);
  });
});
