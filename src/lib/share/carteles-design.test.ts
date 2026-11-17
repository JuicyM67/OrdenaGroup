import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  SIGN_PALETTES,
  cleanSignText,
  defaultSignDesign,
  parseSignDesign,
  parseSignDesigns,
  sameSignDesign,
} from "./carteles-design";

describe("parseSignDesigns", () => {
  it("datos vacíos o raros dan el diseño por defecto", () => {
    for (const raw of [null, undefined, {}, [], "x", 3]) {
      expect(parseSignDesigns(raw)).toEqual({
        reservas: defaultSignDesign("reservas"),
        cuenta: defaultSignDesign("cuenta"),
      });
    }
  });

  it("el diseño por defecto es el cartel de WP-95 (clásico, moderna, claro)", () => {
    expect(defaultSignDesign("reservas")).toMatchObject({
      layout: "clasico",
      fuente: "moderna",
      grosor: "normal",
      paleta: "claro",
      tamano: "a4",
      mostrarLogo: true,
    });
    expect(defaultSignDesign("cuenta").tamano).toBe("a6x4");
  });

  it("lee campo por campo y cambia lo desconocido por el valor por defecto", () => {
    const d = parseSignDesign("reservas", {
      layout: "marco",
      fuente: "comic-sans",
      grosor: "fino",
      paleta: "rosa",
      fondo: { tipo: "foto", foto: "https://malo.example/x.jpg" },
      titulo: "  Agenda\n tu cita  ",
      subtitulo: 42,
      mostrarLogo: "no",
      tamano: "a6x4",
      extra: true,
    });
    expect(d).toEqual({
      ...defaultSignDesign("reservas"),
      layout: "marco",
      grosor: "fino",
      paleta: "rosa",
      titulo: "Agenda tu cita",
    });
  });

  it("corta los textos al máximo", () => {
    const d = parseSignDesign("reservas", { titulo: "a".repeat(100) });
    expect(d.titulo).toHaveLength(40);
  });
});

describe("cleanSignText", () => {
  it("quita saltos de línea y caracteres de control; vacío = null", () => {
    expect(cleanSignText("Hola\u0000\tmundo\r\n", 40)).toBe("Hola mundo");
    expect(cleanSignText("   ", 40)).toBeNull();
    expect(cleanSignText(null, 40)).toBeNull();
  });
});

describe("sameSignDesign", () => {
  it("compara diseños", () => {
    const a = defaultSignDesign("reservas");
    expect(sameSignDesign(a, { ...a })).toBe(true);
    expect(sameSignDesign(a, { ...a, paleta: "salvia" })).toBe(false);
  });
});

// Contraste ≥ 4.5:1 (WCAG AA) de las paletas: texto y texto suave sobre el fondo, y el
// texto sobre el acento. Los valores salen de src/styles/tokens.css.
describe("paletas: contraste", () => {
  const css = readFileSync(
    fileURLToPath(new URL("../../styles/tokens.css", import.meta.url)),
    "utf8",
  );
  const token = (name: string): string => {
    const m = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
    if (!m) throw new Error(`token ${name} saknas`);
    return m[1]!;
  };
  const lum = (hex: string): number => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a: string, b: string): number => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
    return (x + 0.05) / (y + 0.05);
  };

  const APP: Record<string, [string, string, string, string, string]> = {
    claro: [
      "color-surface",
      "color-ink",
      "color-muted",
      "color-lime",
      "color-ink",
    ],
    oscuro: [
      "color-dark",
      "color-on-dark",
      "color-on-dark-soft",
      "color-lime",
      "color-ink",
    ],
    lima: [
      "color-lime",
      "color-ink",
      "color-on-lime-soft",
      "color-ink",
      "color-lime",
    ],
  };

  it.each(SIGN_PALETTES)("%s", (p) => {
    const names =
      APP[p] ??
      (["fondo", "texto", "suave", "acento", "sobre-acento"].map(
        (r) => `sign-${p}-${r}`,
      ) as [string, string, string, string, string]);
    const [fondo, texto, suave, acento, sobre] = names.map(token) as [
      string,
      string,
      string,
      string,
      string,
    ];
    expect(ratio(texto, fondo)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(suave, fondo)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(sobre, acento)).toBeGreaterThanOrEqual(4.5);
  });
});
