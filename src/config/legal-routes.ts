// Policysidornas sökvägar (`/legal/[doc]`). Egen liten modul så att klientkomponenter
// (bokningsformuläret på `/[slug]`) kan länka dit utan att dra in hela rutt-kartan i
// `routes.ts` (D-039, JS-budget). `routes.ts` re-exporterar allt härifrån.

/** Id interno de cada documento legal (`/legal/[doc]`, WP-26 paso 6), con el mismo
 * nombre que su slug (`LEGAL_DOCS_CL` en `src/i18n/legal/`): la ruta del sistema de
 * archivos (`src/app/(marketing)/legal/[doc]/`) usa siempre estos tres valores. */
export type LegalDocId = "privacidad" | "terminos" | "encargo";

/** Länk till en policysida (`/legal/[doc]`). */
export function hrefLegal(id: LegalDocId): string {
  return `/legal/${id}`;
}
