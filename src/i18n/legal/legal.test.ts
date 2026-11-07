/**
 * Pruebas de estructura y de tono para los documentos legales (WP-26
 * paso 5). No repite lo que ya prueba `src/config/brand.test.ts`
 * (ningún archivo de `src/` nombra la marca): acá solo se comprueba lo
 * propio de este módulo.
 */
import { describe, expect, it } from "vitest";

import { REGLAS_DE_TONO } from "../test-helpers";
import {
  LEGAL_DOCS_CL,
  LEGAL_DRAFT_BANNER,
  LEGAL_VERSION,
  PLACEHOLDER_ENTITY_CL,
  type LegalDoc,
} from "./index";

function flatten(doc: LegalDoc): string[] {
  const textos: string[] = [doc.title, doc.versionLabel];
  for (const bloque of doc.intro) {
    textos.push(...(bloque.type === "p" ? [bloque.text] : bloque.items));
  }
  for (const seccion of doc.sections) {
    textos.push(seccion.heading);
    for (const bloque of seccion.blocks) {
      textos.push(...(bloque.type === "p" ? [bloque.text] : bloque.items));
    }
  }
  return textos;
}

const DOCS_CL = Object.entries(LEGAL_DOCS_CL).map(
  ([slug, factory]) => [slug, factory(PLACEHOLDER_ENTITY_CL)] as const,
);
const TODOS_LOS_DOCS = DOCS_CL;

describe("estructura de cada documento", () => {
  it.each(TODOS_LOS_DOCS)(
    "%s: slug, título y secciones no vacíos",
    (slug, doc) => {
      expect(doc.slug).toBe(slug);
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.intro.length).toBeGreaterThan(0);
      expect(doc.sections.length).toBeGreaterThan(0);
      for (const seccion of doc.sections) {
        expect(seccion.id.length).toBeGreaterThan(0);
        expect(seccion.heading.length).toBeGreaterThan(0);
        expect(seccion.blocks.length).toBeGreaterThan(0);
      }
    },
  );

  it.each(TODOS_LOS_DOCS)(
    "%s: es final (aprobado por el dueño 2026-11-07) y de la versión vigente",
    (_slug, doc) => {
      expect(doc.status).toBe("final");
      expect(doc.version).toBe(LEGAL_VERSION);
    },
  );

  it.each(TODOS_LOS_DOCS)("%s: los ids de sección son únicos", (_slug, doc) => {
    const ids = doc.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("línea de versión (banner de borrador)", () => {
  it.each(DOCS_CL)("%s: versionLabel en español", (_slug, doc) => {
    expect(doc.versionLabel).toBe("Versión 2026-10");
  });

  it("el banner de borrador existe", () => {
    expect(LEGAL_DRAFT_BANNER["es-CL"]).toBe(
      "Borrador: este documento está en revisión legal.",
    );
  });
});

describe("la entidad legal llega como parámetro, nunca a mano", () => {
  // `encargo` es un anexo sin sección de contacto propia (el contacto ya
  // está en `privacidad`/`terminos`), así que no se prueba acá.
  const DOCS_CL_CON_CONTACTO = [
    ["privacidad", LEGAL_DOCS_CL.privacidad(PLACEHOLDER_ENTITY_CL)],
    ["terminos", LEGAL_DOCS_CL.terminos(PLACEHOLDER_ENTITY_CL)],
  ] as const;

  it.each(DOCS_CL_CON_CONTACTO)(
    "%s: usa los datos de PLACEHOLDER_ENTITY_CL",
    (_slug, doc) => {
      const texto = flatten(doc).join(" \n ");
      expect(texto).toContain(PLACEHOLDER_ENTITY_CL.contactEmail);
    },
  );

  it("privacidad (CL) y terminos (CL) nombran razón social, RUT y dirección", () => {
    for (const doc of [
      LEGAL_DOCS_CL.privacidad(PLACEHOLDER_ENTITY_CL),
      LEGAL_DOCS_CL.terminos(PLACEHOLDER_ENTITY_CL),
    ]) {
      const texto = flatten(doc).join(" \n ");
      expect(texto).toContain(PLACEHOLDER_ENTITY_CL.legalName);
      expect(texto).toContain(PLACEHOLDER_ENTITY_CL.taxId);
      expect(texto).toContain(PLACEHOLDER_ENTITY_CL.address);
    }
  });
});

describe("plazos de conservación (WP-26, Ägarens svar 2026-09-30)", () => {
  it("privacidad (CL) tiene los tres plazos: 24 meses, 90 días, 5 años", () => {
    const texto = flatten(LEGAL_DOCS_CL.privacidad(PLACEHOLDER_ENTITY_CL)).join(
      " \n ",
    );
    expect(texto).toMatch(/24 meses/);
    expect(texto).toMatch(/90 días/);
    expect(texto).toMatch(/5 años/);
  });

  it("terminos (CL) tiene la ventana de arrepentimiento de 30 días", () => {
    expect(
      flatten(LEGAL_DOCS_CL.terminos(PLACEHOLDER_ENTITY_CL)).join(" \n "),
    ).toMatch(/30 días/);
  });
});

describe("subencargados (misma lista que la política de privacidad)", () => {
  it("encargo (CL) nombra Supabase, Vercel, Meta y Resend", () => {
    const texto = flatten(LEGAL_DOCS_CL.encargo(PLACEHOLDER_ENTITY_CL)).join(
      " \n ",
    );
    for (const proveedor of [
      "Supabase",
      "Vercel",
      "Meta",
      "Resend",
      "Mercado Pago",
    ]) {
      expect(texto).toContain(proveedor);
    }
  });
});

describe("tono (GUIA_DE_ESTILO §1)", () => {
  it.each(TODOS_LOS_DOCS)(
    "%s: ningún bloque usa un giro prohibido",
    (_slug, doc) => {
      for (const texto of flatten(doc)) {
        for (const [nombreRegla, regex] of Object.entries(REGLAS_DE_TONO)) {
          expect(regex.test(texto), `${nombreRegla}: "${texto}"`).toBe(false);
        }
      }
    },
  );
});
