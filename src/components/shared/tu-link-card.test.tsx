import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { inicio } from "@/i18n";

import { TuLinkCard } from "./tu-link-card";

function mockClipboard(writeText: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
}

describe("TuLinkCard", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://ejemplo.cl");
  });

  it('copia el link y pasa a mostrar "Link copiado"', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);

    render(<TuLinkCard slug="barberia-norte" businessName="Barbería Norte" />);

    expect(
      screen.getByText("https://ejemplo.cl/barberia-norte"),
    ).toBeInTheDocument();

    const boton = screen.getByRole("button", { name: inicio.tuLink.copiar });
    fireEvent.click(boton);

    await screen.findByRole("button", { name: inicio.tuLink.copiado });
    expect(writeText).toHaveBeenCalledWith("https://ejemplo.cl/barberia-norte");
  });

  it("el link de WhatsApp codifica el mensaje con el link de reservas", () => {
    mockClipboard(vi.fn());

    render(<TuLinkCard slug="barberia-norte" businessName="Barbería Norte" />);

    const link = screen.getByRole("link", {
      name: inicio.tuLink.compartirWhatsapp,
    });
    const expectedMessage = inicio.tuLink.mensajeWhatsapp({
      negocio: "Barbería Norte",
      url: "https://ejemplo.cl/barberia-norte",
    });
    expect(link).toHaveAttribute(
      "href",
      `https://wa.me/?text=${encodeURIComponent(expectedMessage)}`,
    );
  });

  it('el link "Ver mi página de reservas" apunta al slug', () => {
    mockClipboard(vi.fn());

    render(<TuLinkCard slug="barberia-norte" businessName="Barbería Norte" />);

    const link = screen.getByRole("link", { name: inicio.tuLink.abrir });
    expect(link).toHaveAttribute("href", "/barberia-norte");
  });
});
