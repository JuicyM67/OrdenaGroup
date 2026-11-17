import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ajustesTabVisible } from "@/components/settings/ajustes-tabs";
import { brand } from "@/config/brand";
import { carteles, cuenta } from "@/i18n";

import { Cartel } from "./cartel";
import { CartelPapel } from "./cartel-papel";

const business = { name: "Barbería Norte", logoUrl: null };

describe("Cartel", () => {
  it("reservas: nombre, título, QR, dirección y la esquina de la marca", () => {
    const { container } = render(
      <Cartel
        kind="reservas"
        estilo="claro"
        business={business}
        link="https://ordenagroup.cl/barberia-norte?utm_source=cartel"
        displayUrl="ordenagroup.cl/barberia-norte"
      />,
    );
    expect(screen.getByText("Barbería Norte")).toBeInTheDocument();
    expect(screen.getByText("BN")).toBeInTheDocument();
    expect(screen.getByText(carteles.hoja.reservasTitulo)).toBeInTheDocument();
    expect(
      screen.getByText("ordenagroup.cl/barberia-norte"),
    ).toBeInTheDocument();
    const qr = screen.getByRole("img", { name: carteles.hoja.qrAlt });
    expect(qr.querySelector("path")?.getAttribute("d")).toMatch(/^M\d/);
    const esquina = screen.getByText(brand.name).closest("p");
    expect(esquina?.textContent).toContain(carteles.hoja.esquina);
    expect(container.firstElementChild?.className).toContain("bg-surface");
  });

  it("cuenta: beneficios de la cuenta y el nombre del negocio", () => {
    render(
      <Cartel
        kind="cuenta"
        estilo="oscuro"
        business={business}
        link="https://ordenagroup.cl/cuenta/ingresar?utm_source=cartel"
        displayUrl="ordenagroup.cl/barberia-norte"
      />,
    );
    expect(screen.getByText(carteles.hoja.cuentaTitulo)).toBeInTheDocument();
    expect(
      screen.getByText(
        carteles.hoja.cuentaEyebrow({ negocio: "Barbería Norte" }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(cuenta.ingresar.beneficios.gestionar),
    ).toBeInTheDocument();
    expect(screen.queryByText("ordenagroup.cl/barberia-norte")).toBeNull();
  });

  it("A6 · 4 por hoja: cuatro carteles en una hoja A4", () => {
    const { container } = render(
      <CartelPapel
        size="a6x4"
        kind="cuenta"
        estilo="lima"
        business={business}
        link="https://ordenagroup.cl/cuenta/ingresar?utm_source=cartel"
        displayUrl="ordenagroup.cl/barberia-norte"
      />,
    );
    expect(container.firstElementChild?.className).toContain("cartel-papel-a4");
    expect(
      screen.getAllByRole("img", { name: carteles.hoja.qrAlt }),
    ).toHaveLength(4);
  });
});

describe("pestaña QR", () => {
  const base = {
    role: "staff" as const,
    perms: {
      can_edit_settings: false,
      can_edit_catalog: true,
      can_manage_team: true,
    },
  };

  it("se ve con can_edit_settings, igual que Comparte tu link", () => {
    expect(ajustesTabVisible("qr", base)).toBe(false);
    expect(
      ajustesTabVisible("qr", {
        ...base,
        perms: { ...base.perms, can_edit_settings: true },
      }),
    ).toBe(true);
  });
});
