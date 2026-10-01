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

// ---------------------------------------------------------------------------
// App-rutter (WP-58): samma mönster som ovan, men för ägarytan (`/app/*`) och
// de publika token-sidorna (`/baja/[token]`). CL-sökvägarna är filsystemets
// (`src/app/(app)/app/*`, `src/app/(app-public)/app/*`, `src/app/app/*`,
// `src/app/baja/*`), oförändrade. SE använder svenska slugs, skrivna om i
// `next.config.ts` (samma `seRouteRewrites`/`seRouteRedirects` som
// marknadssidorna). `/v/[token]` och `/r/[token]` är redan korta, språklösa
// koder — de finns INTE i den här tabellen, oförändrade i båda marknaderna.
export type AppRouteId =
  | "appInicio"
  | "appAgenda"
  | "appHoy"
  | "appClientes"
  | "appClienteDetail"
  | "appClientesUtskick"
  | "appClientesUtskickNytt"
  | "appCaja"
  | "appCajaInformes"
  | "appFlash"
  | "appAjustes"
  | "appAjustesNegocio"
  | "appAjustesPerfil"
  | "appAjustesReglas"
  | "appAjustesServicios"
  | "appAjustesFormulario"
  | "appAjustesHorario"
  | "appAjustesSocios"
  | "appAjustesEquipo"
  | "appAjustesPrivacidad"
  | "appSolicitud"
  | "appInvitacion"
  | "appBienvenida"
  | "appOnboarding"
  | "baja";

/** Ajustes-flikarna (`AjustesTabKey`, `ajustes-tabs.tsx`) och deras `AppRouteId` — en
 * nyckel per nyckel, så `ajustesTabHref()` kan återanvända den här tabellen i stället för
 * att duplicera sökvägarna. */
export const AJUSTES_TAB_ROUTE_IDS = {
  negocio: "appAjustesNegocio",
  perfil: "appAjustesPerfil",
  reglas: "appAjustesReglas",
  servicios: "appAjustesServicios",
  formulario: "appAjustesFormulario",
  horario: "appAjustesHorario",
  socios: "appAjustesSocios",
  equipo: "appAjustesEquipo",
  privacidad: "appAjustesPrivacidad",
} as const satisfies Record<string, AppRouteId>;

/** CL-sökvägen (filsystemets), med `[id]`/`[token]` som platshållare för dynamiska
 * segment (bara ett per rutt). */
const CL_APP_ROUTES: Record<AppRouteId, string> = {
  appInicio: "/app/inicio",
  appAgenda: "/app/agenda",
  appHoy: "/app/hoy",
  appClientes: "/app/clientes",
  appClienteDetail: "/app/clientes/[id]",
  appClientesUtskick: "/app/clientes/utskick",
  appClientesUtskickNytt: "/app/clientes/utskick/nytt",
  appCaja: "/app/caja",
  appCajaInformes: "/app/caja/informes",
  appFlash: "/app/flash",
  appAjustes: "/app/ajustes",
  appAjustesNegocio: "/app/ajustes/negocio",
  appAjustesPerfil: "/app/ajustes/perfil",
  appAjustesReglas: "/app/ajustes/reglas",
  appAjustesServicios: "/app/ajustes/servicios",
  appAjustesFormulario: "/app/ajustes/formulario",
  appAjustesHorario: "/app/ajustes/horario",
  appAjustesSocios: "/app/ajustes/socios",
  appAjustesEquipo: "/app/ajustes/equipo",
  appAjustesPrivacidad: "/app/ajustes/privacidad",
  appSolicitud: "/app/solicitudes/[id]",
  appInvitacion: "/app/invitacion/[token]",
  appBienvenida: "/app/bienvenida/[token]",
  appOnboarding: "/app/onboarding",
  baja: "/baja/[token]",
};

/** SE-sökvägen: svensk slug, skriven om (i `next.config.ts`) till samma sidfil som CL. */
const SE_APP_ROUTES: Record<AppRouteId, string> = {
  appInicio: "/app/start",
  appAgenda: "/app/kalender",
  appHoy: "/app/idag",
  appClientes: "/app/kunder",
  appClienteDetail: "/app/kunder/[id]",
  appClientesUtskick: "/app/kunder/utskick",
  appClientesUtskickNytt: "/app/kunder/utskick/nytt",
  appCaja: "/app/kassa",
  appCajaInformes: "/app/kassa/rapporter",
  appFlash: "/app/blixttider",
  appAjustes: "/app/installningar",
  appAjustesNegocio: "/app/installningar/foretag",
  appAjustesPerfil: "/app/installningar/profil",
  appAjustesReglas: "/app/installningar/bokningsregler",
  appAjustesServicios: "/app/installningar/tjanster",
  appAjustesFormulario: "/app/installningar/bokningsformular",
  appAjustesHorario: "/app/installningar/oppettider",
  appAjustesSocios: "/app/installningar/medlemmar",
  appAjustesEquipo: "/app/installningar/team",
  appAjustesPrivacidad: "/app/installningar/integritet",
  appSolicitud: "/app/forfragningar/[id]",
  appInvitacion: "/app/inbjudan/[token]",
  appBienvenida: "/app/valkommen/[token]",
  appOnboarding: "/app/kom-igang",
  baja: "/avregistrera/[token]",
};

const APP_ROUTES_BY_MARKET: Record<Market, Record<AppRouteId, string>> = {
  CL: CL_APP_ROUTES,
  SE: SE_APP_ROUTES,
};

/** Länk till en app-rutt, i den här installationens marknad. `param` ersätter ruttens
 * enda dynamiska segment (`[id]`/`[token]`) om den har ett — hash/query läggs på av
 * anroparen (t.ex. `` `${appHref("appAgenda")}?vista=dia&fecha=${d}` ``, samma mönster
 * som innan, se WP-58-planen). */
export function appHref(id: AppRouteId, param?: string): string {
  const path = APP_ROUTES_BY_MARKET[market][id];
  return param === undefined ? path : path.replace(/\[(?:id|token)\]/, param);
}

function stripDynamicSegment(path: string): string {
  return path.replace(/\[(?:id|token)\]$/, "");
}

/** Prefixet (utan själva id/token-delen) för en dynamisk app-rutt, i BÅDA marknadernas
 * form — oavsett vilken marknad den här installationen kör. `src/proxy.ts` körs före
 * `next.config.ts`s rewrites/redirects och måste därför känna igen både den spanska och
 * den svenska sökvägen när den avgör om en rutt är publik. */
export function appRoutePrefixes(id: AppRouteId): readonly [string, string] {
  return [stripDynamicSegment(CL_APP_ROUTES[id]), stripDynamicSegment(SE_APP_ROUTES[id])];
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

/** `[id]`/`[token]` (våra platshållare) → `:id`/`:token` (path-to-regexp, det
 * `next.config.ts`s `rewrites`/`redirects` förstår). */
function toRewritePath(path: string): string {
  return path.replace(/\[(id|token)\]/, ":$1");
}

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
  const appRutter = (Object.keys(CL_APP_ROUTES) as AppRouteId[]).map((id) => ({
    source: toRewritePath(SE_APP_ROUTES[id]),
    destination: toRewritePath(CL_APP_ROUTES[id]),
  }));
  return [...rutter, ...industrier, ...legal, ...appRutter];
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
  const appRutter = (Object.keys(CL_APP_ROUTES) as AppRouteId[]).map((id) => ({
    source: toRewritePath(CL_APP_ROUTES[id]),
    destination: toRewritePath(SE_APP_ROUTES[id]),
    permanent: true as const,
  }));
  return [...rutter, ...industrier, ...legal, ...appRutter];
}
