import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { reserva } from "@/i18n";

import { BookingBar } from "./booking-bar";

describe("BookingBar", () => {
  it("priset visar det gamla priset med dold text", () => {
    render(
      <BookingBar
        summary="Corte + barba · Mar 6, 11:30"
        price={{ total: "$14.400", old: "$18.000" }}
        ctaLabel={reserva.bookingBar.ctaReservar}
        onCta={() => {}}
      />,
    );
    expect(
      screen.getByText(reserva.precioAnteriorAria({ precio: "$18.000" })),
    ).toBeInTheDocument();
  });

  it('CTA "En la lista" är aria-disabled', () => {
    render(
      <BookingBar
        summary="Corte + barba · Sáb 3 · lista de espera"
        price={null}
        ctaLabel={reserva.waitlist.ctaEnLaLista}
        ctaDisabled
        onCta={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: reserva.waitlist.ctaEnLaLista }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("regionen har etiketten från sammanfattningen", () => {
    render(
      <BookingBar
        summary="Corte + barba · Mar 6, 11:30"
        price={{ total: "$14.400", old: null }}
        ctaLabel={reserva.bookingBar.ctaReservar}
        onCta={() => {}}
      />,
    );
    expect(
      screen.getByRole("region", { name: "Corte + barba · Mar 6, 11:30" }),
    ).toBeInTheDocument();
  });
});
