/**
 * Pruebas de `sitio` (sitio público completo: nav, footer, inicio,
 * funcionalidades, precios, para quién, preguntas, contacto) y de los datos
 * que viven fuera de `Trad` por traer lista o número
 * (`SITIO_FUNCIONALIDADES`, `SITIO_PRECIOS_TABLA`, `SITIO_PARA_INDUSTRIAS`).
 * Mismo patrón que `es-CL.landing.test.ts`, reutilizando `./test-helpers`.
 */
import { describe, expect, it } from "vitest";

import { brand } from "@/config/brand";

import {
  sitio,
  SITIO_FUNCIONALIDADES,
  SITIO_PARA_INDUSTRIAS,
  SITIO_PRECIOS_TABLA,
} from "./es-CL";
import {
  NOMBRES_FIXTURE,
  paraCadaHoja,
  PATRON_MARCA,
  PATRON_RESTO_ROTO,
  REGLAS_DE_TONO,
  type Rama,
} from "./test-helpers";

const MUESTRA_GENERICA = {
  nombre: "texto de ejemplo",
  precio: "$9.990",
} as const;

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

/** Todos los textos sueltos (no los de `sitio`) de las tres listas externas,
 * para pasarlos por las mismas reglas de tono, marca y fixtures. */
function textosDeListasExternas(): string[] {
  const textos: string[] = [];
  for (const s of SITIO_FUNCIONALIDADES) {
    textos.push(s.etiqueta, s.titulo, s.texto, ...s.puntos);
  }
  for (const fila of SITIO_PRECIOS_TABLA) {
    textos.push(fila.funcion, ...Object.values(fila.valores));
  }
  for (const industria of SITIO_PARA_INDUSTRIAS) {
    textos.push(
      industria.nombre,
      industria.hero.titulo,
      industria.hero.texto,
      industria.cta,
      ...industria.beneficios,
      ...industria.servicios.map((s) => s.nombre),
      ...industria.faq.flatMap((f) => [f.pregunta, f.respuesta]),
    );
  }
  return textos;
}

// ---------------------------------------------------------------------------
// Estructura
// ---------------------------------------------------------------------------

describe("sitio: estructura", () => {
  it("cada hoja es un string no vacío o una función", () => {
    paraCadaHoja(sitio, "sitio", (ruta, hoja) => {
      if (typeof hoja === "string") {
        expect(hoja.length, ruta).toBeGreaterThan(0);
      } else {
        expect(typeof hoja, ruta).toBe("function");
      }
    });
  });

  it("ninguna función deja restos rotos con una muestra genérica", () => {
    for (const resultado of todosLosResultadosDeFunciones(sitio)) {
      expect(PATRON_RESTO_ROTO.test(resultado), resultado).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Tono y marca
// ---------------------------------------------------------------------------

describe("sitio: tono", () => {
  it("ningún texto (estático, resultado de función o de las listas externas) usa un giro prohibido", () => {
    const todos = [
      ...todosLosStringsEstaticos(sitio),
      ...todosLosResultadosDeFunciones(sitio),
      ...textosDeListasExternas(),
    ];
    for (const texto of todos) {
      for (const [nombreRegla, regex] of Object.entries(REGLAS_DE_TONO)) {
        expect(regex.test(texto), `${nombreRegla}: "${texto}"`).toBe(false);
      }
    }
  });
});

describe("sitio: marca", () => {
  it("ningún texto estático ni de las listas externas escribe el nombre del producto a mano", () => {
    const todos = [
      ...todosLosStringsEstaticos(sitio),
      ...textosDeListasExternas(),
    ];
    for (const texto of todos) {
      expect(PATRON_MARCA.test(texto), texto).toBe(false);
    }
  });

  it("las funciones invocadas con una muestra genérica tampoco escriben el nombre a mano", () => {
    for (const resultado of todosLosResultadosDeFunciones(sitio)) {
      expect(PATRON_MARCA.test(resultado), resultado).toBe(false);
    }
    for (const industria of SITIO_PARA_INDUSTRIAS) {
      const titulo = industria.meta.titulo({ nombre: MUESTRA_GENERICA.nombre });
      const descripcion = industria.meta.descripcion({
        nombre: MUESTRA_GENERICA.nombre,
      });
      expect(PATRON_MARCA.test(titulo), titulo).toBe(false);
      expect(PATRON_MARCA.test(descripcion), descripcion).toBe(false);
    }
  });

  it("cada meta.titulo/meta.descripcion nombra el negocio solo vía el parámetro `nombre`", () => {
    for (const pagina of [
      sitio.funcionalidades,
      sitio.precios,
      sitio.preguntas,
      sitio.contacto,
    ]) {
      expect(pagina.meta.titulo({ nombre: brand.name })).toContain(brand.name);
      expect(pagina.meta.descripcion({ nombre: brand.name })).toContain(
        brand.name,
      );
    }
    for (const industria of SITIO_PARA_INDUSTRIAS) {
      expect(industria.meta.titulo({ nombre: brand.name })).toContain(
        brand.name,
      );
      expect(industria.meta.descripcion({ nombre: brand.name })).toContain(
        brand.name,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// SEO: meta.descripcion ≤ 155 caracteres, con el nombre real de la marca
// ---------------------------------------------------------------------------

describe("sitio: longitud de meta.descripcion", () => {
  it("funcionalidades, precios, preguntas y contacto miden 155 caracteres o menos", () => {
    for (const pagina of [
      sitio.funcionalidades,
      sitio.precios,
      sitio.preguntas,
      sitio.contacto,
    ]) {
      expect(
        pagina.meta.descripcion({ nombre: brand.name }).length,
      ).toBeLessThanOrEqual(155);
    }
  });

  it("cada rubro de SITIO_PARA_INDUSTRIAS mide 155 caracteres o menos", () => {
    for (const industria of SITIO_PARA_INDUSTRIAS) {
      expect(
        industria.meta.descripcion({ nombre: brand.name }).length,
        industria.id,
      ).toBeLessThanOrEqual(155);
    }
  });
});

// ---------------------------------------------------------------------------
// Nombres de fixtures: no deben aparecer sueltos
// ---------------------------------------------------------------------------

describe("sitio: nombres de fixtures no aparecen sueltos", () => {
  const todos = [
    ...todosLosStringsEstaticos(sitio),
    ...textosDeListasExternas(),
  ].join("\n");
  it.each(NOMBRES_FIXTURE)('"%s" no aparece en sitio', (nombre) => {
    expect(todos.includes(nombre), nombre).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SITIO_FUNCIONALIDADES: contrato contra MVP_SPEC.md (F1–F19)
// ---------------------------------------------------------------------------

describe("SITIO_FUNCIONALIDADES", () => {
  it("tiene las diez secciones esperadas, en orden", () => {
    expect(SITIO_FUNCIONALIDADES.map((s) => s.id)).toEqual([
      "link-reservas",
      "agenda",
      "hoy",
      "reservas-manuales",
      "ajustes",
      "recordatorios",
      "lista-espera",
      "abono",
      "fichas-clientes",
      "reportes",
    ]);
  });

  it("lo que ya existe en el producto no está marcado próximamente, y lo planeado sí", () => {
    const disponibles = [
      "link-reservas",
      "agenda",
      "hoy",
      "reservas-manuales",
      "ajustes",
    ];
    const proximas = [
      "recordatorios",
      "lista-espera",
      "abono",
      "fichas-clientes",
      "reportes",
    ];
    for (const seccion of SITIO_FUNCIONALIDADES) {
      if (disponibles.includes(seccion.id)) {
        expect(seccion.proximamente, seccion.id).toBe(false);
      }
      if (proximas.includes(seccion.id)) {
        expect(seccion.proximamente, seccion.id).toBe(true);
      }
    }
  });

  it("cada sección tiene etiqueta, título, texto y exactamente tres puntos, todos no vacíos", () => {
    for (const seccion of SITIO_FUNCIONALIDADES) {
      expect(seccion.etiqueta.length, seccion.id).toBeGreaterThan(0);
      expect(seccion.titulo.length, seccion.id).toBeGreaterThan(0);
      expect(seccion.texto.length, seccion.id).toBeGreaterThan(0);
      expect(seccion.puntos.length, seccion.id).toBe(3);
      for (const punto of seccion.puntos) {
        expect(punto.length, `${seccion.id}: ${punto}`).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// SITIO_PRECIOS_TABLA
// ---------------------------------------------------------------------------

describe("SITIO_PRECIOS_TABLA", () => {
  it("cada fila tiene un nombre de función y un valor no vacío para los cuatro planes", () => {
    for (const fila of SITIO_PRECIOS_TABLA) {
      expect(fila.funcion.length, fila.funcion).toBeGreaterThan(0);
      for (const clave of ["gratis", "emprende", "equipo", "local"] as const) {
        expect(
          fila.valores[clave].length,
          `${fila.funcion}.${clave}`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// SITIO_PARA_INDUSTRIAS
// ---------------------------------------------------------------------------

describe("SITIO_PARA_INDUSTRIAS", () => {
  it("tiene los cuatro rubros esperados, en orden", () => {
    expect(SITIO_PARA_INDUSTRIAS.map((i) => i.id)).toEqual([
      "barberias",
      "peluquerias",
      "estetica",
      "kinesiologia",
    ]);
  });

  it("cada rubro tiene hero, tres beneficios, entre 3 y 4 servicios con minutos válidos, dos preguntas y un cta", () => {
    for (const industria of SITIO_PARA_INDUSTRIAS) {
      expect(industria.hero.titulo.length, industria.id).toBeGreaterThan(0);
      expect(industria.hero.texto.length, industria.id).toBeGreaterThan(0);
      expect(industria.beneficios.length, industria.id).toBe(3);
      expect(industria.servicios.length, industria.id).toBeGreaterThanOrEqual(
        3,
      );
      expect(industria.servicios.length, industria.id).toBeLessThanOrEqual(4);
      for (const servicio of industria.servicios) {
        expect(Number.isInteger(servicio.minutos), servicio.nombre).toBe(true);
        expect(servicio.minutos, servicio.nombre).toBeGreaterThan(0);
      }
      expect(industria.faq.length, industria.id).toBe(2);
      expect(industria.cta.length, industria.id).toBeGreaterThan(0);
    }
  });

  it("kinesiología no usa nombres de servicio con detalle clínico (GUIA §9)", () => {
    const kine = SITIO_PARA_INDUSTRIAS.find((i) => i.id === "kinesiologia");
    expect(kine).toBeDefined();
    const prohibidas = /diagnóstico|tratamiento médico|rehabilitación/i;
    for (const servicio of kine!.servicios) {
      expect(prohibidas.test(servicio.nombre), servicio.nombre).toBe(false);
    }
  });
});
