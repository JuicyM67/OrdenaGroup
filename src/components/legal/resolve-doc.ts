// Resuelve el `LegalDoc` correcto para la ruta `/legal/[doc]` (WP-26 paso 6). La ruta
// del sistema de archivos siempre usa el id CL (`privacidad`/`terminos`/`encargo`,
// `LegalDocId` en `@/config/routes`) — igual que `/para/[industria]` siempre usa el id
// CL de `IndustriaId` — y `next.config.ts` reescribe la slug sueca hacia ese mismo id
// (ver `seRouteRewrites`). Acá se elige, según el mercado de esta instalación, qué mapa
// de documentos (`LEGAL_DOCS_CL`/`LEGAL_DOCS_SE`) y qué `LegalEntity` (`brand.legal`)
// usar para construirlo.
import { brand, market } from "@/config/brand";
import type { LegalDocId } from "@/config/routes";
import {
  LEGAL_DOCS_CL,
  LEGAL_DOCS_SE,
  type LegalDoc,
  type LegalDocSlugSE,
} from "@/i18n/legal";

/** Los tres ids válidos, en el mismo orden que `LegalDocId`. */
export const LEGAL_DOC_IDS: readonly LegalDocId[] = [
  "privacidad",
  "terminos",
  "encargo",
];

/** Mismas cadenas que `SE_LEGAL_SLUGS` en `@/config/routes` (no se importa de ahí para
 * no mezclar routing con contenido) — acá son las claves de `LEGAL_DOCS_SE`, no una URL. */
const SE_DOC_KEY: Record<LegalDocId, LegalDocSlugSE> = {
  privacidad: "integritet",
  terminos: "villkor",
  encargo: "bitradesavtal",
};

export function isLegalDocId(value: string): value is LegalDocId {
  return (LEGAL_DOC_IDS as readonly string[]).includes(value);
}

/** `null` si `id` no es un documento válido (la página llama a `notFound()`). */
export function resolveLegalDoc(id: string): LegalDoc | null {
  if (!isLegalDocId(id)) return null;
  if (market === "SE") {
    return LEGAL_DOCS_SE[SE_DOC_KEY[id]](brand.legal);
  }
  return LEGAL_DOCS_CL[id](brand.legal);
}
