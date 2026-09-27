import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { E164 } from "@/lib/format/phone";

import { EventPopover } from "./event-popover";
import type { AgendaBooking } from "./types";

const booking: AgendaBooking = {
  id: "bk-vie-2",
  staffId: "staff-1",
  start: "2026-10-02T11:30:00-03:00",
  end: "2026-10-02T12:05:00-03:00",
  clientName: "Martina Lagos",
  phone: "+56912344821" as E164,
  visitNumber: 6,
  service: "Corte clásico",
  priceClp: 12_000,
  depositPaidClp: 3_000,
  source: "web",
  status: "confirmed",
  confirmedByCustomer: true,
};

function Harness({
  onLlego,
  onNoVino,
  onMover,
}: {
  onLlego: () => void;
  onNoVino: () => void;
  onMover: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <EventPopover
      booking={booking}
      staffName="Diego"
      open={open}
      onOpenChange={setOpen}
      onLlego={onLlego}
      onNoVino={onNoVino}
      onMover={onMover}
      trigger={<button type="button">Martina Lagos</button>}
    />
  );
}

describe("EventPopover", () => {
  it("klick öppnar, Escape stänger, fokus tillbaka på blocket", async () => {
    const user = userEvent.setup();
    render(<Harness onLlego={vi.fn()} onNoVino={vi.fn()} onMover={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Martina Lagos" });
    await user.click(trigger);
    expect(
      screen.getByRole("dialog", { name: "Detalle de la reserva" }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "Detalle de la reserva" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("Llegó anropar onLlego (ändrar bara det lokala fixture-läget, WP-12 FRÅGA 7)", async () => {
    const user = userEvent.setup();
    const onLlego = vi.fn();
    render(<Harness onLlego={onLlego} onNoVino={vi.fn()} onMover={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Martina Lagos" }));
    await user.click(screen.getByRole("button", { name: "Llegó" }));
    expect(onLlego).toHaveBeenCalledOnce();
  });

  it("visa el nombre del cliente, el servicio, con quién y el pago con abono", async () => {
    const user = userEvent.setup();
    render(<Harness onLlego={vi.fn()} onNoVino={vi.fn()} onMover={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Martina Lagos" }));

    expect(
      screen.getByText("+56 9 •••• 4821 · 6.ª visita"),
    ).toBeInTheDocument();
    expect(screen.getByText("Corte clásico")).toBeInTheDocument();
    expect(screen.getByText("con Diego")).toBeInTheDocument();
    expect(
      screen.getByText("$12.000 · abono $3.000 pagado"),
    ).toBeInTheDocument();
    expect(screen.getByText("Confirmó por WhatsApp")).toBeInTheDocument();
  });
});
