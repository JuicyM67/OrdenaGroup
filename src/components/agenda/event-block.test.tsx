import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EventBlock } from "./event-block";

describe("EventBlock", () => {
  it('flash muestra la etiqueta "Flash −20%"', () => {
    render(
      <EventBlock
        variant="flash"
        staffColor={3}
        title="Emilio Tapia"
        meta="12:15 · Corte + barba"
        showAvatar={false}
        top={0}
        height={80}
        flashPct={20}
        ariaLabel="Emilio Tapia, Corte + barba, 12:15 – 13:05, con Tomás"
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText("Flash −20%")).toBeInTheDocument();
  });

  it('lista de espera muestra la etiqueta "Lista de espera"', () => {
    render(
      <EventBlock
        variant="waitlist"
        staffColor={3}
        title="Ian Soto"
        meta={null}
        showAvatar={false}
        top={0}
        height={35}
        ariaLabel="Ian Soto, Corte, 11:45 – 12:20, con Tomás"
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText("Lista de espera")).toBeInTheDocument();
  });

  it("vald tiene borde ink (border-2 border-ink)", () => {
    render(
      <EventBlock
        variant="staff"
        staffColor={1}
        selected
        title="Martina Lagos"
        meta="11:30 · Corte clásico"
        showAvatar={false}
        top={0}
        height={50}
        ariaLabel="Martina Lagos, Corte clásico, 11:30 – 12:05, con Diego"
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByRole("button")).toHaveClass("border-2", "border-ink");
  });

  it("el nombre accesible incluye al profesional (el color no es el único indicador)", () => {
    render(
      <EventBlock
        variant="staff"
        staffColor={1}
        title="Martina Lagos"
        meta="11:30 · Corte clásico"
        showAvatar={false}
        top={0}
        height={50}
        ariaLabel="Martina Lagos, Corte clásico, 11:30 – 12:05, con Diego"
        onClick={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /con Diego/i }),
    ).toBeInTheDocument();
  });

  it("onClick se dispara al hacer click", async () => {
    const onClick = vi.fn();
    render(
      <EventBlock
        variant="staff"
        staffColor={1}
        title="Martina Lagos"
        meta={null}
        showAvatar={false}
        top={0}
        height={50}
        ariaLabel="Martina Lagos"
        onClick={onClick}
      />,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
