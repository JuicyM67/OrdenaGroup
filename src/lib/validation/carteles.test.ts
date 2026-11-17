import { describe, expect, it } from "vitest";

import { defaultSignDesign } from "@/lib/share/carteles-design";

import { validateSignDesign } from "./carteles";

describe("validateSignDesign", () => {
  it("acepta un diseño completo y limpia los textos", () => {
    const r = validateSignDesign("reservas", {
      ...defaultSignDesign("reservas"),
      layout: "centrado",
      fuente: "elegante",
      paleta: "negro-oro",
      titulo: "  Agenda tu cita\n aquí ",
      subtitulo: null,
    });
    expect(r).toEqual({
      ok: true,
      design: {
        ...defaultSignDesign("reservas"),
        layout: "centrado",
        fuente: "elegante",
        paleta: "negro-oro",
        titulo: "Agenda tu cita aquí",
      },
    });
  });

  it("texto vacío = texto sugerido", () => {
    const r = validateSignDesign("cuenta", {
      ...defaultSignDesign("cuenta"),
      titulo: "   ",
    });
    expect(r.ok && r.design.titulo).toBeNull();
  });

  it.each([
    { tipo: "liso" },
    { tipo: "patron", patron: "arcos" },
    { tipo: "foto", foto: "portada" },
    { tipo: "foto", foto: "0b6f3c1e-5d2a-4c8b-9e7f-1a2b3c4d5e6f" },
  ])("acepta el fondo %j", (fondo) => {
    const r = validateSignDesign("reservas", {
      ...defaultSignDesign("reservas"),
      fondo,
    });
    expect(r.ok && r.design.fondo).toEqual(fondo);
  });

  it.each([
    ["valor desconocido", { paleta: "fucsia" }],
    ["patrón desconocido", { fondo: { tipo: "patron", patron: "cebra" } }],
    [
      "foto como URL",
      { fondo: { tipo: "foto", foto: "https://malo.example/x.jpg" } },
    ],
    ["fondo con campo extra", { fondo: { tipo: "liso", color: "#000" } }],
    ["campo extra", { color: "#ff00ff" }],
    ["título largo", { titulo: "a".repeat(41) }],
    ["subtítulo largo", { subtitulo: "a".repeat(91) }],
    ["tamaño de otro cartel", { tamano: "a6x4" }],
    ["fondo desconocido", { fondo: { tipo: "url", url: "https://x" } }],
  ])("rechaza %s", (_name, patch) => {
    expect(
      validateSignDesign("reservas", {
        ...defaultSignDesign("reservas"),
        ...patch,
      }),
    ).toEqual({ ok: false, code: "invalid" });
  });

  it("rechaza algo que no es un objeto", () => {
    expect(validateSignDesign("reservas", "hola").ok).toBe(false);
  });
});
