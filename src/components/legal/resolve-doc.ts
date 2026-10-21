// Resuelve el `LegalDoc` correcto para la ruta `/legal/[doc]` (WP-26 paso 6). La ruta
// del sistema de archivos usa el id (`privacidad`/`terminos`/`encargo`, `LegalDocId` en
// `@/config/routes`); el documento se construye con la `LegalEntity` de `brand.legal`.
import { brand } from "@/config/brand";
import type { LegalDocId } from "@/config/routes";
import { LEGAL_DOCS_CL, type LegalDoc } from "@/i18n/legal";

/** Los tres ids válidos, en el mismo orden que `LegalDocId`. */
export const LEGAL_DOC_IDS: readonly LegalDocId[] = [
  "privacidad",
  "terminos",
  "encargo",
];

export function isLegalDocId(value: string): value is LegalDocId {
  return (LEGAL_DOC_IDS as readonly string[]).includes(value);
}

/** `null` si `id` no es un documento válido (la página llama a `notFound()`). */
export function resolveLegalDoc(id: string): LegalDoc | null {
  if (!isLegalDocId(id)) return null;
  return LEGAL_DOCS_CL[id](brand.legal);
}
