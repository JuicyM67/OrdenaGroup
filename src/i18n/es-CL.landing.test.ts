/**
 * Pruebas de `landing` (página pública de marketing), `PLANES_LANDING` y
 * `inicio.tuLink` (tarjeta del link de reservas). Mismo patrón que
 * `es-CL.test.ts`/`es-CL.v2.test.ts`, reutilizando `./test-helpers` para no
 * duplicar las reglas de tono, el patrón de marca ni la lista de nombres de
 * fixture. Archivo propio (en vez de agregar `landing` a `AREAS`/`AREAS_V2`)
 * para no tocar los tests de otros paquetes.
 */
import { describe, expect, it } from "vitest";

import { brand } from "@/config/brand";

import { inicio, landing, PLANES_LANDING } from "./es-CL";
import {
  NOMBRES_FIXTURE,
  paraCadaHoja,
  PATRON_MARCA,
  PATRON_RESTO_ROTO,
  REGLAS_DE_TONO,
  type Rama,
} from "./test-helpers";

const MUESTRA_GENERICA = {
  tagline: "texto de ejemplo",
  nombre: "texto de ejemplo",
  negocio: "Negocio de ejemplo",
  url: "https://ejemplo.cl/negocio",
} as const;

/** Invoca cualquier hoja-función con una muestra genérica: cada parámetro
 * nombrado se resuelve por nombre contra `MUESTRA_GENERICA`, igual que en
 * `es-CL.v2.test.ts`. */
function invocarGenerico(fn: (p: never) => string): string {
  return (fn as (p: Record<string, string>) => string)(MUESTRA_GENERICA);
}

function todosLosStringsEstaticos(raiz: Rama): string[] {
  const encontrados: string[] = [];
  paraCadaHoja(raiz, "", (_ruta, hoja) => {
    if (typeof hoja === "string") encontrados.push(hoja);
  });
  return encontrados;
}

function todosLosResultadosDeFunciones(raiz: Rama): string[] {
  const encontrados: string[] = [];
  paraCadaHoja(raiz, "", (_ruta, hoja) => {
    if (typeof hoja === "function") encontrados.push(invocarGenerico(hoja));
  });
  return encontrados;
}

// ---------------------------------------------------------------------------
// Estructura
// ---------------------------------------------------------------------------

describe("landing: estructura", () => {
  it("cada hoja es un string no vacío o una función", () => {
    paraCadaHoja(landing, "landing", (ruta, hoja) => {
      if (typeof hoja === "string") {
        expect(hoja.length, ruta).toBeGreaterThan(0);
      } else {
        expect(typeof hoja, ruta).toBe("function");
      }
    });
  });

  it("ninguna función deja restos rotos con una muestra genérica", () => {
    for (const resultado of todosLosResultadosDeFunciones(landing)) {
      expect(PATRON_RESTO_ROTO.test(resultado), resultado).toBe(false);
    }
  });
});

describe("inicio.tuLink: estructura", () => {
  it("cada hoja es un string no vacío o una función", () => {
    paraCadaHoja(inicio.tuLink, "inicio.tuLink", (ruta, hoja) => {
      if (typeof hoja === "string") {
        expect(hoja.length, ruta).toBeGreaterThan(0);
      } else {
        expect(typeof hoja, ruta).toBe("function");
      }
    });
  });

  it("mensajeWhatsapp arma un mensaje con el negocio y el link, sin restos rotos", () => {
    const texto = inicio.tuLink.mensajeWhatsapp({
      negocio: "Barbería Central",
      url: "https://ejemplo.cl/barberia-central",
    });
    expect(texto).toContain("Barbería Central");
    expect(texto).toContain("https://ejemplo.cl/barberia-central");
    expect(PATRON_RESTO_ROTO.test(texto)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tono y marca
// ---------------------------------------------------------------------------

describe("landing e inicio.tuLink: tono", () => {
  it("ningún texto (estático o resultado de función) usa un giro prohibido", () => {
    const todos = [
      ...todosLosStringsEstaticos(landing),
      ...todosLosResultadosDeFunciones(landing),
      ...todosLosStringsEstaticos(inicio.tuLink as unknown as Rama),
      ...todosLosResultadosDeFunciones(inicio.tuLink as unknown as Rama),
    ];
    for (const texto of todos) {
      for (const [nombreRegla, regex] of Object.entries(REGLAS_DE_TONO)) {
        expect(regex.test(texto), `${nombreRegla}: "${texto}"`).toBe(false);
      }
    }
  });

  it("los puntos y los nombres de PLANES_LANDING no usan un giro prohibido", () => {
    for (const plan of PLANES_LANDING) {
      for (const texto of [plan.nombre, plan.cta, ...plan.puntos]) {
        for (const [nombreRegla, regex] of Object.entries(REGLAS_DE_TONO)) {
          expect(regex.test(texto), `${nombreRegla}: "${texto}"`).toBe(false);
        }
      }
    }
  });
});

describe("landing e inicio.tuLink: marca", () => {
  it("ningún texto estático escribe el nombre del producto a mano", () => {
    const todos = [
      ...todosLosStringsEstaticos(landing),
      ...todosLosStringsEstaticos(inicio.tuLink as unknown as Rama),
      ...PLANES_LANDING.flatMap((p) => [p.nombre, p.cta, ...p.puntos]),
    ];
    for (const texto of todos) {
      expect(PATRON_MARCA.test(texto), texto).toBe(false);
    }
  });

  it("las funciones invocadas con una muestra genérica tampoco escriben el nombre a mano", () => {
    // `hero.titulo` y `meta.*` reciben el nombre/tagline como parámetro: con
    // una muestra genérica (no `brand.name`/`brand.tagline`) no deben
    // contener la marca.
    for (const resultado of todosLosResultadosDeFunciones(landing)) {
      expect(PATRON_MARCA.test(resultado), resultado).toBe(false);
    }
  });

  it("hero.titulo solo repite la tagline recibida, nunca la escribe a mano", () => {
    expect(landing.hero.titulo({ tagline: brand.tagline })).toBe(brand.tagline);
  });

  it("meta.titulo y meta.descripcion nombran el negocio solo vía el parámetro `nombre`", () => {
    expect(landing.meta.titulo({ nombre: brand.name })).toContain(brand.name);
    expect(landing.meta.descripcion({ nombre: brand.name })).toContain(
      brand.name,
    );
  });
});

// ---------------------------------------------------------------------------
// SEO: descripción ≤ 155 caracteres (con el nombre real de la marca)
// ---------------------------------------------------------------------------

describe("landing.meta: longitud", () => {
  it("meta.descripcion con brand.name real mide 155 caracteres o menos", () => {
    expect(
      landing.meta.descripcion({ nombre: brand.name }).length,
    ).toBeLessThanOrEqual(155);
  });
});

// ---------------------------------------------------------------------------
// Nombres de fixtures: no deben aparecer sueltos en `landing`
// ---------------------------------------------------------------------------

describe("landing: nombres de fixtures no aparecen sueltos", () => {
  const todos = todosLosStringsEstaticos(landing).join("\n");
  it.each(NOMBRES_FIXTURE)('"%s" no aparece en landing', (nombre) => {
    expect(todos.includes(nombre), nombre).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PLANES_LANDING: contrato de precios contra GO_TO_MARKET.md
// ---------------------------------------------------------------------------

describe("PLANES_LANDING", () => {
  it("tiene los cuatro planes de GO_TO_MARKET.md, en orden, con sus precios en heltal CLP", () => {
    expect(PLANES_LANDING.map((p) => p.id)).toEqual([
      "gratis",
      "emprende",
      "equipo",
      "local",
    ]);
    expect(PLANES_LANDING.map((p) => p.precioClp)).toEqual([
      0, 9990, 19990, 34990,
    ]);
  });

  it("cada plan tiene nombre, cta y al menos un punto, todos no vacíos", () => {
    for (const plan of PLANES_LANDING) {
      expect(plan.nombre.length, plan.id).toBeGreaterThan(0);
      expect(plan.cta.length, plan.id).toBeGreaterThan(0);
      expect(plan.puntos.length, plan.id).toBeGreaterThan(0);
      for (const punto of plan.puntos) {
        expect(punto.length, `${plan.id}: ${punto}`).toBeGreaterThan(0);
      }
    }
  });

  it("ningún precio es negativo ni tiene decimales (heltal CLP, regla dura 5)", () => {
    for (const plan of PLANES_LANDING) {
      expect(Number.isInteger(plan.precioClp), plan.id).toBe(true);
      expect(plan.precioClp, plan.id).toBeGreaterThanOrEqual(0);
    }
  });
});
