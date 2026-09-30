// Rutt-karta per marknad (D-025: en installation per marknad). CL behåller de spanska
// sökvägarna sidfilerna redan har under `(marketing)/` (t.ex. `/precios`). SE använder
// svenska slugs; `next.config.ts` skriver om dem (`rewrites`) till samma sidfiler och
// gör permanenta redirects (308) från de gamla spanska sökvägarna (för delade länkar).
//
// Interna länkar på hemsidan ska alltid gå via `href()` / `hrefIndustria()` härifrån,
// aldrig hårdkodade `/precios`-strängar — annars pekar SE-installationen på fel sida.
// `/login` är undantaget (auth-route, rörs inte här).
import { market, type Market } from "./brand";

export type RouteId =
  | "inicio"
  | "precios"
  | "funcionalidades"
  | "horasFlash"
  | "ventajas"
  | "preguntas"
  | "contacto";

/** Samma id:n som i `SITIO_PARA_INDUSTRIAS` (`src/i18n/es-CL.marketing.ts` / `sv-SE.ts`). */
export type IndustriaId =
  "barberias" | "peluquerias" | "estetica" | "kinesiologia";

/** Id interno de cada documento legal (`/legal/[doc]`, WP-26 paso 6), con el mismo
 * nombre que su slug CL (`LEGAL_DOCS_CL` en `src/i18n/legal/`): la ruta del sistema de
 * archivos (`src/app/(marketing)/legal/[doc]/`) usa siempre estos tres valores, igual
 * que `/para/[industria]` usa siempre el id CL de `IndustriaId`. */
export type LegalDocId = "privacidad" | "terminos" | "encargo";

/** CL-sökvägen: exakt filsystemsrutten under `(marketing)/`, oavsett marknad. */
const CL_ROUTES: Record<RouteId, string> = {
  inicio: "/",
  precios: "/precios",
  funcionalidades: "/funcionalidades",
  horasFlash: "/horas-flash",
  ventajas: "/ventajas",
  preguntas: "/preguntas",
  contacto: "/contacto",
};

/** SE-sökvägen: svensk slug, skriven om (i `next.config.ts`) till samma sidfil som CL. */
const SE_ROUTES: Record<RouteId, string> = {
  inicio: "/",
  precios: "/priser",
  funcionalidades: "/funktioner",
  horasFlash: "/flashtider",
  ventajas: "/fordelar",
  preguntas: "/vanliga-fragor",
  contacto: "/kontakt",
};

const ROUTES_BY_MARKET: Record<Market, Record<RouteId, string>> = {
  CL: CL_ROUTES,
  SE: SE_ROUTES,
};

/** Svensk slug per industri-id, för `/for/<slug>` (CL fortsätter använda `/para/<id>`). */
const SE_INDUSTRIA_SLUGS: Record<IndustriaId, string> = {
  barberias: "barberare",
  peluquerias: "frisorer",
  estetica: "hudvard",
  kinesiologia: "naprapat",
};

/** Svensk slug per dokument-id, för `/legal/<slug>` (CL fortsätter använda `/legal/<id>`).
 * Samma strängar som nycklarna i `LEGAL_DOCS_SE` (`src/i18n/legal/index.ts`) — de råkar
 * sammanfalla, men den här listan är den enda källan för routingen. */
const SE_LEGAL_SLUGS: Record<LegalDocId, string> = {
  privacidad: "integritet",
  terminos: "villkor",
  encargo: "bitradesavtal",
};

/** Länk till en av de delade marknadssidorna, i den här installationens marknad.
 * `hash` läggs på utan `#` (t.ex. `href("funcionalidades", "agenda")` → `/funktioner#agenda`
 * på SE, `/funcionalidades#agenda` på CL). */
export function href(id: RouteId, hash?: string): string {
  const path = ROUTES_BY_MARKET[market][id];
  return hash ? `${path}#${hash}` : path;
}

/** Länk till en policysida (`/legal/[doc]`), i den här installationens marknad. */
export function hrefLegal(id: LegalDocId): string {
  if (market === "SE") return `/legal/${SE_LEGAL_SLUGS[id]}`;
  return `/legal/${id}`;
}

/** Alla dokument-id:n med sin svenska slug, i en fast ordning — används av
 * `next.config.ts` för att bygga SE:s `/legal/<slug>`-rewrites (samma mönster som
 * `SE_INDUSTRIA_SLUG_LIST`). */
export const SE_LEGAL_SLUG_LIST: readonly {
  readonly id: LegalDocId;
  readonly slug: string;
}[] = (Object.keys(SE_LEGAL_SLUGS) as LegalDocId[]).map((id) => ({
  id,
  slug: SE_LEGAL_SLUGS[id],
}));

/** Länk till branschsidan (`/para/[industria]`), i den här installationens marknad. */
export function hrefIndustria(id: IndustriaId): string {
  if (market === "SE") return `/for/${SE_INDUSTRIA_SLUGS[id]}`;
  return `/para/${id}`;
}

/** Alla industri-id:n med sin svenska slug, i en fast ordning — används av `next.config.ts`
 * för att bygga SE:s `/for/<slug>`-rewrites utan att duplicera listan. */
export const SE_INDUSTRIA_SLUG_LIST: readonly {
  readonly id: IndustriaId;
  readonly slug: string;
}[] = (Object.keys(SE_INDUSTRIA_SLUGS) as IndustriaId[]).map((id) => ({
  id,
  slug: SE_INDUSTRIA_SLUGS[id],
}));

/** `{ source, destination }`-par: svensk slug → befintlig (spansk) sidfilsrutt. Bara SE
 * (`next.config.ts` anropar den här funktionen enbart när `NEXT_PUBLIC_MARKET=SE`). */
export function seRouteRewrites(): { source: string; destination: string }[] {
  const rutter = (Object.keys(CL_ROUTES) as RouteId[])
    .filter((id) => id !== "inicio")
    .map((id) => ({ source: SE_ROUTES[id], destination: CL_ROUTES[id] }));
  const industrier = SE_INDUSTRIA_SLUG_LIST.map(({ id, slug }) => ({
    source: `/for/${slug}`,
    destination: `/para/${id}`,
  }));
  const legal = SE_LEGAL_SLUG_LIST.map(({ id, slug }) => ({
    source: `/legal/${slug}`,
    destination: `/legal/${id}`,
  }));
  return [...rutter, ...industrier, ...legal];
}

/** `{ source, destination, permanent }`-par: gamla spanska sökvägar → nya svenska (308),
 * så delade/indexerade länkar fortsätter fungera. Bara SE. */
export function seRouteRedirects(): {
  source: string;
  destination: string;
  permanent: true;
}[] {
  const rutter = (Object.keys(CL_ROUTES) as RouteId[])
    .filter((id) => id !== "inicio")
    .map((id) => ({
      source: CL_ROUTES[id],
      destination: SE_ROUTES[id],
      permanent: true as const,
    }));
  const industrier = SE_INDUSTRIA_SLUG_LIST.map(({ id, slug }) => ({
    source: `/para/${id}`,
    destination: `/for/${slug}`,
    permanent: true as const,
  }));
  const legal = SE_LEGAL_SLUG_LIST.map(({ id, slug }) => ({
    source: `/legal/${id}`,
    destination: `/legal/${slug}`,
    permanent: true as const,
  }));
  return [...rutter, ...industrier, ...legal];
}
