/**
 * Tipos y utilidades compartidos por todos los documentos legales
 * (`src/i18n/legal/`, WP-26 paso 5). Un `LegalDoc` es un árbol de texto
 * plano que la UI recorre para pintar una página de política o de
 * términos: título, una introducción (sin encabezado) y una lista de
 * secciones, cada una con su propio encabezado y una lista de bloques
 * (párrafo o lista con viñetas).
 *
 * Este módulo no importa `@/config/brand`: ningún documento legal nombra
 * la marca (regla dura 10; `src/config/brand.test.ts` ya lo comprueba
 * para todo `src/`). La razón social de la
 * entidad legal viaja siempre como parámetro (`LegalEntity`, ver
 * `./entity.ts`), nunca escrita a mano.
 */

/** Un párrafo de texto corrido. */
export interface LegalParagraph {
  readonly type: "p";
  readonly text: string;
}

/** Una lista con viñetas (varias ideas cortas dentro de una misma sección,
 * p. ej. la lista de subencargados o de derechos). */
export interface LegalList {
  readonly type: "list";
  readonly items: readonly string[];
}

export type LegalBlock = LegalParagraph | LegalList;

export function p(text: string): LegalParagraph {
  return { type: "p", text };
}

export function list(items: readonly string[]): LegalList {
  return { type: "list", items };
}

/** Una sección con su propio encabezado. `id` es un slug estable en
 * kebab-case (p. ej. "cuanto-tiempo") para que la UI pueda armar un enlace
 * ancla o una tabla de contenido; no es texto visible por sí solo. */
export interface LegalSection {
  readonly id: string;
  readonly heading: string;
  readonly blocks: readonly LegalBlock[];
}

/**
 * Un documento legal completo. `status` siempre es `"draft"` hoy (WP-26,
 * "Ägarens svar" 2026-09-30): la UI muestra un aviso mientras sea así (ver
 * `LEGAL_DRAFT_BANNER` en `./index.ts`) y deja de mostrarlo cuando un
 * documento pase a `"final"` tras la revisión de un abogado (WP-27).
 * `version`/`versionLabel` son la línea "Versión 2026-10"/"Version
 * 2026-10" que va al pie de cada documento.
 */
export interface LegalDoc {
  readonly slug: string;
  readonly title: string;
  readonly status: "draft" | "final";
  readonly version: string;
  readonly versionLabel: string;
  /** Texto de apertura, antes de la primera sección con encabezado. */
  readonly intro: readonly LegalBlock[];
  readonly sections: readonly LegalSection[];
}

/** Todo lo que hoy tiene una sola versión vigente por mercado: "2026-10". */
export const LEGAL_VERSION = "2026-10";
