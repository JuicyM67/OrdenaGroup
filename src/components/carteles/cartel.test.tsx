import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ajustesTabVisible } from "@/components/settings/ajustes-tabs";
import { brand } from "@/config/brand";
import { carteles, cuenta } from "@/i18n";
import {
  defaultSignDesign,
  type SignDesign,
} from "@/lib/share/carteles-design";

import { Cartel, cartelThemeClass } from "./cartel";
import { CartelPapel } from "./cartel-papel";

// next/font fungerar bara i Next; här räcker klassnamnen.
vi.mock("./fonts", () => ({ CARTEL_FONT_VARIABLES: "font-vars" }));

const business = { name: "Barbería Norte", logoUrl: null, fotos: [] };
const reservasLink = "https://ordenagroup.cl/barberia-norte?utm_source=cartel";
const cuentaLink = "https://ordenagroup.cl/cuenta/ingresar?utm_source=cartel";
const displayUrl = "ordenagroup.cl/barberia-norte";

function reservas(patch: Partial<SignDesign> = {}) {
  return render(
    <Cartel
      kind="reservas"
      design={{ ...defaultSignDesign("reservas"), ...patch }}
      business={business}
      link={reservasLink}
      displayUrl={displayUrl}
    />,
  );
}

describe("Cartel", () => {
  it("reservas por defecto: nombre, iniciales, título, QR, dirección y esquina", () => {
    const { container } = reservas();
    expect(screen.getByText("Barbería Norte")).toBeInTheDocument();
    expect(screen.getByText("BN")).toBeInTheDocument();
    expect(screen.getByText(carteles.hoja.reservasTitulo)).toBeInTheDocument();
    expect(screen.getByText(carteles.hoja.reservasTexto)).toBeInTheDocument();
    expect(screen.getByText(displayUrl)).toBeInTheDocument();
    const qr = screen.getByRole("img", { name: carteles.hoja.qrAlt });
    expect(qr.querySelector("path")?.getAttribute("d")).toMatch(/^M\d/);
    const esquina = screen.getByText(brand.name).closest("p");
    expect(esquina?.textContent).toContain(carteles.hoja.esquina);
    expect(container.firstElementChild?.className).toContain(
      "cartel-paleta-claro",
    );
  });

  it("textos propios reemplazan a los sugeridos; sin logo no hay iniciales", () => {
    reservas({
      titulo: "Agenda tu cita",
      subtitulo: "Uñas y pestañas",
      mostrarLogo: false,
    });
    expect(screen.getByText("Agenda tu cita")).toBeInTheDocument();
    expect(screen.getByText("Uñas y pestañas")).toBeInTheDocument();
    expect(screen.queryByText(carteles.hoja.reservasTitulo)).toBeNull();
    expect(screen.queryByText("BN")).toBeNull();
    expect(screen.getByText("Barbería Norte")).toBeInTheDocument();
  });

  it.each(["clasico", "centrado", "marco", "foto"] as const)(
    "plantilla %s: QR, nombre y esquina siempre",
    (layout) => {
      reservas({ layout });
      expect(
        screen.getByRole("img", { name: carteles.hoja.qrAlt }),
      ).toBeInTheDocument();
      expect(screen.getByText("Barbería Norte")).toBeInTheDocument();
      expect(screen.getByText(brand.name)).toBeInTheDocument();
    },
  );

  it("paleta, tipografía y grosor van como clases", () => {
    const { container } = reservas({
      paleta: "negro-oro",
      fuente: "elegante",
      grosor: "fino",
    });
    const cls = container.firstElementChild?.className ?? "";
    expect(cls).toContain("cartel-paleta-negro-oro");
    expect(cls).toContain("cartel-fuente-elegante");
    expect(cls).toContain("cartel-grosor-fino");
  });

  it("manuscrita tiene un solo grosor", () => {
    expect(
      cartelThemeClass({
        paleta: "rosa",
        fuente: "manuscrita",
        grosor: "fino",
      }),
    ).toContain("cartel-grosor-normal");
  });

  it("cuenta: beneficios y nombre del negocio, sin la dirección", () => {
    render(
      <Cartel
        kind="cuenta"
        design={{ ...defaultSignDesign("cuenta"), paleta: "oscuro" }}
        business={business}
        link={cuentaLink}
        displayUrl={displayUrl}
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
    expect(screen.queryByText(displayUrl)).toBeNull();
  });

  it("A6 · 4 por hoja: cuatro carteles en una hoja A4", () => {
    const { container } = render(
      <CartelPapel
        size="a6x4"
        kind="cuenta"
        design={defaultSignDesign("cuenta")}
        business={business}
        link={cuentaLink}
        displayUrl={displayUrl}
      />,
    );
    expect(container.firstElementChild?.className).toContain("cartel-papel-a4");
    expect(
      screen.getAllByRole("img", { name: carteles.hoja.qrAlt }),
    ).toHaveLength(4);
  });
});

describe("Cartel: fondos (WP-96b)", () => {
  const foto = { id: "portada", url: "https://x.test/portada.jpg" };

  function withPhotos(patch: Partial<SignDesign>) {
    return render(
      <Cartel
        kind="reservas"
        design={{ ...defaultSignDesign("reservas"), ...patch }}
        business={{ ...business, fotos: [foto] }}
        link={reservasLink}
        displayUrl={displayUrl}
      />,
    );
  }

  it("un patrón se dibuja detrás del contenido", () => {
    const { container } = reservas({
      fondo: { tipo: "patron", patron: "puntos" },
    });
    expect(container.querySelector(".cartel-patron-puntos")).not.toBeNull();
  });

  it("en Banda el patrón va en la banda con los colores sobre el acento", () => {
    const { container } = reservas({
      layout: "foto",
      fondo: { tipo: "patron", patron: "rayas" },
    });
    const p = container.querySelector(".cartel-patron-rayas");
    expect(p?.className).toContain("cartel-patron-en-banda");
  });

  it("con foto, el contenido va sobre un recuadro", () => {
    const { container } = withPhotos({
      fondo: { tipo: "foto", foto: "portada" },
    });
    expect(container.querySelector("img")?.getAttribute("src")).toBe(foto.url);
    const panel = container.querySelector(".cartel-sobre-foto");
    expect(panel?.textContent).toContain(carteles.hoja.reservasTitulo);
  });

  it("en Banda el foto va en la banda y el nombre en una bricka", () => {
    const { container } = withPhotos({
      layout: "foto",
      fondo: { tipo: "foto", foto: "portada" },
    });
    expect(container.querySelector(".cartel-sobre-foto")).toBeNull();
    expect(container.querySelector(".cartel-bricka")?.textContent).toContain(
      "Barbería Norte",
    );
  });

  it("si la foto ya no existe, el fondo es liso", () => {
    const { container } = reservas({
      fondo: { tipo: "foto", foto: "0b6f3c1e-5d2a-4c8b-9e7f-1a2b3c4d5e6f" },
    });
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".cartel-sobre-foto")).toBeNull();
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
