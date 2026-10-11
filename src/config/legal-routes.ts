// Policysidornas sökvägar (`/legal/[doc]`). Egen liten modul så att klientkomponenter
// (bokningsformuläret på `/[slug]`) kan länka dit utan att dra in hela rutt-kartan i
// `routes.ts` (D-039, JS-budget). `routes.ts` re-exporterar allt härifrån.
import { market } from "./brand";

/** Id interno de cada documento legal (`/legal/[doc]`, WP-26 paso 6), con el mismo
 * nombre que su slug CL (`LEGAL_DOCS_CL` en `src/i18n/legal/`): la ruta del sistema de
 * archivos (`src/app/(marketing)/legal/[doc]/`) usa siempre estos tres valores, igual
 * que `/para/[industria]` usa siempre el id CL de `IndustriaId`. */
export type LegalDocId = "privacidad" | "terminos" | "encargo";

/** Svensk slug per dokument-id, för `/legal/<slug>` (CL fortsätter använda `/legal/<id>`).
 * Samma strängar som nycklarna i `LEGAL_DOCS_SE` (`src/i18n/legal/index.ts`) — de råkar
 * sammanfalla, men den här listan är den enda källan för routingen. */
export const SE_LEGAL_SLUGS: Record<LegalDocId, string> = {
  privacidad: "integritet",
  terminos: "villkor",
  encargo: "bitradesavtal",
};

/** Länk till en policysida (`/legal/[doc]`), i den här installationens marknad. */
export function hrefLegal(id: LegalDocId): string {
  if (market === "SE") return `/legal/${SE_LEGAL_SLUGS[id]}`;
  return `/legal/${id}`;
}
