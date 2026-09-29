import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { formulario } from "@/i18n";

import { AppliesToPanel } from "./applies-to-panel";
import type {
  BookingFormCategory,
  BookingFormService,
} from "./booking-form-types";

const categories: BookingFormCategory[] = [
  { id: "cat-dam", name: "Dam", sort: 1, serviceCount: 2 },
  { id: "cat-herr", name: "Herr", sort: 2, serviceCount: 1 },
];

const services: BookingFormService[] = [
  {
    id: "svc-corte",
    name: "Corte dama",
    active: true,
    categoryId: "cat-dam",
    questionCount: 0,
  },
  {
    id: "svc-color",
    name: "Color",
    active: true,
    categoryId: "cat-dam",
    questionCount: 0,
  },
  {
    id: "svc-barba",
    name: "Barba",
    active: true,
    categoryId: "cat-herr",
    questionCount: 0,
  },
];

describe("AppliesToPanel", () => {
  it("parte en 'Todos los servicios' cuando initial.appliesTo = 'all'", () => {
    render(
      <AppliesToPanel
        questionLabel="Largo de pelo"
        categories={categories}
        services={services}
        initial={{ appliesTo: "all" }}
        onCancel={vi.fn()}
        onSave={vi.fn().mockResolvedValue({ ok: true })}
      />,
    );
    expect(
      screen.getByRole("button", { name: formulario.aplicaA.todos }),
    ).toHaveAttribute("aria-pressed", "true");
    // El buscador solo se muestra en modo "Valda tjänster".
    expect(
      screen.queryByPlaceholderText(formulario.aplicaA.buscarPlaceholder),
    ).not.toBeInTheDocument();
  });

  it("marcar 'Hela kategorin Dam' actualiza el contador 'x de y' y guarda category­Ids", async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: true });
    render(
      <AppliesToPanel
        questionLabel="Largo de pelo"
        categories={categories}
        services={services}
        initial={{ appliesTo: "targets", serviceIds: [], categoryIds: [] }}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: /Dam/ }));
    expect(
      screen.getByText(formulario.aplicaA.seleccion({ x: 2, y: 2 })),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", {
        name: formulario.aplicaA.ctaGuardar({ n: 2 }),
      }),
    );
    expect(onSave).toHaveBeenCalledWith({
      appliesTo: "targets",
      categoryIds: ["cat-dam"],
      serviceIds: [],
    });
  });

  it("muestra el texto de error cuando onSave devuelve too_many_questions", async () => {
    const onSave = vi
      .fn()
      .mockResolvedValue({ ok: false, code: "too_many_questions" });
    render(
      <AppliesToPanel
        questionLabel="Largo de pelo"
        categories={categories}
        services={services}
        initial={{ appliesTo: "all" }}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", {
        name: formulario.aplicaA.ctaGuardar({ n: 0 }),
      }),
    );
    expect(
      await screen.findByText(formulario.errores.too_many_questions),
    ).toBeInTheDocument();
  });
});
