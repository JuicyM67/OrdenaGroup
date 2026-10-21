/**
 * Punto de entrada de los documentos legales (WP-26 paso 5). Ver
 * `./types.ts` para la forma de un `LegalDoc` y `./entity.ts` para los
 * datos de la entidad legal (`LegalEntity`) que cada documento recibe
 * como parámetro.
 *
 * No importa `@/config/brand`: ningún documento legal nombra la marca
 * (regla dura 10). El nombre visible del remitente/negocio tampoco entra
 * acá; estos documentos hablan siempre de "la plataforma".
 */
import { getEncargoCL } from "./es-CL.encargo";
import { getPrivacidadCL } from "./es-CL.privacidad";
import { getTerminosCL } from "./es-CL.terminos";

export type {
  LegalBlock,
  LegalDoc,
  LegalList,
  LegalParagraph,
  LegalSection,
} from "./types";
export { LEGAL_VERSION, list, p } from "./types";

export type { LegalEntity } from "./entity";
export { PLACEHOLDER_ENTITY_CL } from "./entity";

export { getEncargoCL } from "./es-CL.encargo";
export { getPrivacidadCL } from "./es-CL.privacidad";
export { getTerminosCL } from "./es-CL.terminos";

/**
 * Todos los documentos, con la misma clave que su `slug`
 * (`/legal/[doc]`, WP-26 paso 6, ui-engineer): `privacidad`, `terminos`,
 * `encargo`. Cada valor es una función que recibe la `LegalEntity` y
 * devuelve el `LegalDoc` completo.
 */
export const LEGAL_DOCS_CL = {
  privacidad: getPrivacidadCL,
  terminos: getTerminosCL,
  encargo: getEncargoCL,
} as const;

export type LegalDocSlugCL = keyof typeof LEGAL_DOCS_CL;

/**
 * Banner de borrador (WP-26, "Ägarens svar" 2026-09-30): la UI lo
 * muestra arriba de cada documento mientras su `status` sea `"draft"`
 * (todos hoy) y deja de mostrarlo cuando pase a `"final"` (WP-27).
 */
export const LEGAL_DRAFT_BANNER = {
  "es-CL": "Borrador: este documento está en revisión legal.",
} as const;
