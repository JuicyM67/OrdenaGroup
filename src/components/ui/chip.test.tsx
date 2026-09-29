import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Chip } from "./chip";

describe("Chip", () => {
  it("renderar texten som skickas in", () => {
    render(<Chip tone="success">Confirmada</Chip>);
    expect(screen.getByText("Confirmada")).toBeInTheDocument();
  });

  it('tone="tag" sätter versaler via klass, men behåller texten som den skickas in i DOM', () => {
    render(<Chip size="tag">Flash −20%</Chip>);
    const el = screen.getByText("Flash −20%");
    expect(el.textContent).toBe("Flash −20%");
    expect(el.className).toContain("uppercase");
  });

  it('size="trend" ger rounded-chip, padding 4/8 och text-12 (Main "bajando")', () => {
    render(
      <Chip tone="success" size="trend">
        bajando
      </Chip>,
    );
    const el = screen.getByText("bajando");
    expect(el.className).toContain("rounded-chip");
    expect(el.className).toContain("px-2");
    expect(el.className).toContain("py-1");
    expect(el.className).toContain("text-12");
    expect(el.className).toContain("font-bold");
  });

  it('size="badge" ger rounded-badge, padding 2/6 och text-11 (Reserva "−20%")', () => {
    render(<Chip size="badge">−20%</Chip>);
    const el = screen.getByText("−20%");
    expect(el.className).toContain("rounded-badge");
    expect(el.className).toContain("px-1.5");
    expect(el.className).toContain("py-0.5");
    expect(el.className).toContain("text-11");
  });

  it('tone="lavender" ger bg-lavender text-on-lilac-soft (WP-40 "gäller för")', () => {
    render(
      <Chip tone="lavender" size="sm">
        Färgning, Slingor
      </Chip>,
    );
    const el = screen.getByText("Färgning, Slingor");
    expect(el.className).toContain("bg-lavender");
    expect(el.className).toContain("text-on-lilac-soft");
  });

  it('tone="peach-50" ger bg-peach-50 text-ink (Hoy "Abono")', () => {
    render(
      <Chip tone="peach-50" size="xs">
        Abono
      </Chip>,
    );
    const el = screen.getByText("Abono");
    expect(el.className).toContain("bg-peach-50");
    expect(el.className).toContain("text-ink");
  });

  it('weight="bold" vinner över size="sm":s font-semibold (cn/tailwind-merge, Hoy "Confirmó")', () => {
    render(
      <Chip tone="success" size="sm" weight="bold">
        Confirmó
      </Chip>,
    );
    const el = screen.getByText("Confirmó");
    expect(el.className).toContain("font-bold");
    expect(el.className).not.toContain("font-semibold");
  });

  it('weight standard behåller size="sm":s font-semibold', () => {
    render(
      <Chip tone="pending" size="sm">
        Sin confirmar
      </Chip>,
    );
    const el = screen.getByText("Sin confirmar");
    expect(el.className).toContain("font-semibold");
    expect(el.className).not.toContain("font-bold");
  });
});
