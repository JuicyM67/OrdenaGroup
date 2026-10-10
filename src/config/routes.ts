// Rutt-karta per marknad (D-025: en installation per marknad). CL behåller de spanska
// sökvägarna sidfilerna redan har under `(marketing)/` (t.ex. `/precios`). SE använder
// svenska slugs; `next.config.ts` skriver om dem (`rewrites`) till samma sidfiler och
// gör permanenta redirects (308) från de gamla spanska sökvägarna (för delade länkar).
//
// Interna länkar på hemsidan ska alltid gå via `href()` / `hrefIndustria()` härifrån,
// aldrig hårdkodade `/precios`-strängar — annars pekar SE-installationen på fel sida.
// `/login` är undantaget (auth-route, rörs inte här).
import { market, type Market } from "./brand";
import { anchor } from "./url-params";

export type RouteId =
  | "inicio"
  | "precios"
  | "funcionalidades"
  | "horasFlash"
  | "ventajas"
  | "preguntas"
  | "contacto"
  | "ejemploNegocio";

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
  ejemploNegocio: "/demo/negocio",
};

/** SE-sökvägen: svensk slug, skriven om (i `next.config.ts`) till samma sidfil som CL. */
const SE_ROUTES: Record<RouteId, string> = {
  inicio: "/",
  precios: "/priser",
  funcionalidades: "/funktioner",
  horasFlash: "/blixttider",
  ventajas: "/fordelar",
  preguntas: "/vanliga-fragor",
  contacto: "/kontakt",
  ejemploNegocio: "/demo/foretag",
};

const ROUTES_BY_MARKET: Record<Market, Record<RouteId, string>> = {
  CL: CL_ROUTES,
  SE: SE_ROUTES,
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
  return hash ? `${path}#${anchor(hash)}` : path;
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

// ---------------------------------------------------------------------------
// Funktionssidor och branschsidor (WP-75). Filsystemets (CL) sökvägar:
//   /funcionalidades/<slug>   (+ /horas-flash och /migracion som egna sidfiler)
//   /rubros och /rubros/<slug>
// SE får svenska slugs (`/funktioner/<slug>`, `/blixttider`, `/flytt`, `/branscher/<slug>`)
// via samma rewrites/redirects som övriga marknadssidor.
// ---------------------------------------------------------------------------

export type FuncionId =
  | "reservas"
  | "pagos"
  | "resenas"
  | "horasFlash"
  | "listaEspera"
  | "recordatorios"
  | "agenda"
  | "caja"
  | "migracion";

/** Ordning i menyn, översikten och sitemap. */
export const FUNCION_IDS: readonly FuncionId[] = [
  "reservas",
  "pagos",
  "resenas",
  "horasFlash",
  "listaEspera",
  "recordatorios",
  "agenda",
  "caja",
  "migracion",
];

const CL_FUNCION_PATHS: Record<FuncionId, string> = {
  reservas: "/funcionalidades/reservas-online",
  pagos: "/funcionalidades/pagos",
  resenas: "/funcionalidades/resenas",
  horasFlash: "/horas-flash",
  listaEspera: "/funcionalidades/lista-de-espera",
  recordatorios: "/funcionalidades/recordatorios",
  agenda: "/funcionalidades/agenda-y-equipo",
  caja: "/funcionalidades/caja-e-informes",
  migracion: "/migracion",
};

const SE_FUNCION_PATHS: Record<FuncionId, string> = {
  reservas: "/funktioner/onlinebokning",
  pagos: "/funktioner/betalning",
  resenas: "/funktioner/omdomen",
  horasFlash: "/blixttider",
  listaEspera: "/funktioner/vantelista",
  recordatorios: "/funktioner/paminnelser",
  agenda: "/funktioner/kalender",
  caja: "/funktioner/kassa",
  migracion: "/flytt",
};

/** Funktioner som inte finns på en marknad (kundbetalning är inte byggd på CL, D-044). */
const FUNCION_ONLY_MARKET: Partial<Record<FuncionId, Market>> = { pagos: "SE" };

export function funcionAvailable(id: FuncionId, m: Market = market): boolean {
  const only = FUNCION_ONLY_MARKET[id];
  return only === undefined || only === m;
}

/** Funktionerna som finns i den här installationens marknad, i menyordning. */
export function funcionesDisponibles(m: Market = market): FuncionId[] {
  return FUNCION_IDS.filter((id) => funcionAvailable(id, m));
}

export function hrefFuncion(id: FuncionId): string {
  return market === "SE" ? SE_FUNCION_PATHS[id] : CL_FUNCION_PATHS[id];
}

/** Sista segmentet i CL-sökvägen för funktioner under `/funcionalidades/[funcion]`. */
export function funcionFromParam(slug: string): FuncionId | undefined {
  return FUNCION_IDS.find(
    (id) => CL_FUNCION_PATHS[id] === `/funcionalidades/${slug}`,
  );
}

/** Param-värdena (CL-slugs) för `/funcionalidades/[funcion]`. */
export function funcionParamSlugs(): string[] {
  return FUNCION_IDS.filter((id) =>
    CL_FUNCION_PATHS[id].startsWith("/funcionalidades/"),
  ).map((id) => CL_FUNCION_PATHS[id].slice("/funcionalidades/".length));
}

/** Samma id:n som bildfilerna i `public/marketing/<id>.webp`. */
export type RubroId =
  | "frisor"
  | "barberare"
  | "naglar"
  | "fransar"
  | "hudvard"
  | "massage"
  | "naprapat"
  | "yoga"
  | "tatuering"
  | "hundtrim"
  | "pt"
  | "makeup";

export const RUBRO_IDS: readonly RubroId[] = [
  "frisor",
  "barberare",
  "naglar",
  "fransar",
  "hudvard",
  "massage",
  "naprapat",
  "yoga",
  "tatuering",
  "hundtrim",
  "pt",
  "makeup",
];

/** Sista segmentet i `/rubros/<slug>` (filsystemet, CL). De fyra första branscherna behåller
 * sina gamla `/para/<slug>`-id:n. */
const CL_RUBRO_SLUGS: Record<RubroId, string> = {
  frisor: "peluquerias",
  barberare: "barberias",
  naglar: "unas",
  fransar: "pestanas-y-cejas",
  hudvard: "estetica",
  massage: "masajes",
  naprapat: "kinesiologia",
  yoga: "yoga-y-pilates",
  tatuering: "tatuajes",
  hundtrim: "peluqueria-canina",
  pt: "entrenamiento-personal",
  makeup: "maquillaje",
};

const SE_RUBRO_SLUGS: Record<RubroId, string> = {
  frisor: "frisor",
  barberare: "barberare",
  naglar: "naglar",
  fransar: "fransar-och-bryn",
  hudvard: "hudvard",
  massage: "massage",
  naprapat: "naprapat-och-fysio",
  yoga: "yoga-och-pilates",
  tatuering: "tatuering",
  hundtrim: "hundtrim",
  pt: "personlig-traning",
  makeup: "makeup",
};

/** Gamla `/for/<slug>` på SE (före WP-75) → nytt branschid. */
const SE_LEGACY_FOR_SLUGS: Record<string, RubroId> = {
  barberare: "barberare",
  frisorer: "frisor",
  hudvard: "hudvard",
  naprapat: "naprapat",
};

export function hrefRubros(): string {
  return market === "SE" ? "/branscher" : "/rubros";
}

export function hrefRubro(id: RubroId): string {
  return market === "SE"
    ? `/branscher/${SE_RUBRO_SLUGS[id]}`
    : `/rubros/${CL_RUBRO_SLUGS[id]}`;
}

export function rubroFromParam(slug: string): RubroId | undefined {
  return RUBRO_IDS.find((id) => CL_RUBRO_SLUGS[id] === slug);
}

export function rubroParamSlugs(): string[] {
  return RUBRO_IDS.map((id) => CL_RUBRO_SLUGS[id]);
}

/** Länk till en av de gamla fyra branscherna (kvar för äldre anropare). */
export function hrefIndustria(id: IndustriaId): string {
  return hrefRubro(INDUSTRIA_TO_RUBRO[id]);
}

const INDUSTRIA_TO_RUBRO: Record<IndustriaId, RubroId> = {
  barberias: "barberare",
  peluquerias: "frisor",
  estetica: "hudvard",
  kinesiologia: "naprapat",
};

/** Alla publika, indexerbara sökvägar i den här marknaden (sitemap.xml). */
export function sitemapPaths(): string[] {
  const paths = [
    href("inicio"),
    href("precios"),
    href("funcionalidades"),
    href("ventajas"),
    href("preguntas"),
    href("contacto"),
    ...funcionesDisponibles().map(hrefFuncion),
    hrefRubros(),
    ...RUBRO_IDS.map(hrefRubro),
    hrefLegal("privacidad"),
    hrefLegal("terminos"),
    hrefLegal("encargo"),
  ];
  return [...new Set(paths)];
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
  | "appClientesResenas"
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
  | "appAjustesPagos"
  | "appAjustesPlan"
  | "appSolicitud"
  | "appInvitacion"
  | "appBienvenida"
  | "appOnboarding"
  | "baja"
  | "resena";

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
  pagos: "appAjustesPagos",
  plan: "appAjustesPlan",
} as const satisfies Record<string, AppRouteId>;

/** CL-sökvägen (filsystemets), med `[id]`/`[token]` som platshållare för dynamiska
 * segment (bara ett per rutt). */
const CL_APP_ROUTES: Record<AppRouteId, string> = {
  appInicio: "/app/inicio",
  appAgenda: "/app/agenda",
  appHoy: "/app/hoy",
  appClientes: "/app/clientes",
  // WP-65: före `appClienteDetail` — rewrites/redirects byggs i nyckelordning,
  // och `/app/kunder/:id` skulle annars fånga `/app/kunder/omdomen` först.
  appClientesResenas: "/app/clientes/resenas",
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
  appAjustesPagos: "/app/ajustes/pagos",
  appAjustesPlan: "/app/ajustes/plan",
  appSolicitud: "/app/solicitudes/[id]",
  appInvitacion: "/app/invitacion/[token]",
  appBienvenida: "/app/bienvenida/[token]",
  appOnboarding: "/app/onboarding",
  baja: "/baja/[token]",
  resena: "/resena/[token]",
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
  appClientesResenas: "/app/kunder/omdomen",
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
  appAjustesPagos: "/app/installningar/betalningar",
  appAjustesPlan: "/app/installningar/plan",
  appSolicitud: "/app/forfragningar/[id]",
  appInvitacion: "/app/inbjudan/[token]",
  appBienvenida: "/app/valkommen/[token]",
  appOnboarding: "/app/kom-igang",
  baja: "/avregistrera/[token]",
  resena: "/recension/[token]",
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
  return [
    stripDynamicSegment(CL_APP_ROUTES[id]),
    stripDynamicSegment(SE_APP_ROUTES[id]),
  ];
}

/** `[id]`/`[token]` (våra platshållare) → `:id`/`:token` (path-to-regexp, det
 * `next.config.ts`s `rewrites`/`redirects` förstår). */
function toRewritePath(path: string): string {
  return path.replace(/\[(id|token)\]/, ":$1");
}

/** SE-slug → CL-sidfil för funktions- och branschsidorna (WP-75). */
function seMarketingPagePairs(): { source: string; destination: string }[] {
  // `horasFlash` finns redan som RouteId (/blixttider ↔ /horas-flash).
  const funciones = FUNCION_IDS.filter((id) => id !== "horasFlash").map(
    (id) => ({
      source: SE_FUNCION_PATHS[id],
      destination: CL_FUNCION_PATHS[id],
    }),
  );
  const rubros = [
    { source: "/branscher", destination: "/rubros" },
    ...RUBRO_IDS.map((id) => ({
      source: `/branscher/${SE_RUBRO_SLUGS[id]}`,
      destination: `/rubros/${CL_RUBRO_SLUGS[id]}`,
    })),
  ];
  return [...funciones, ...rubros];
}

// ---------------------------------------------------------------------------
// Marknadsplatsen (WP-68, D-055). Filsystemet (CL): `src/app/(consumer)/descubre/**`
// och `src/app/(consumer)/oferta/[slug]`. SE: `/upptack`, `/upptack/karta`,
// `/upptack/<kategori>[/<ort>]`, `/erbjudande/<slug>` (rewrites/redirects nedan).
// Kategorislugsen per marknad finns i `marketplace.ts`. I CL är ytan dold (404).
// ---------------------------------------------------------------------------
export type MarketplaceRouteId = "descubre" | "descubreMapa" | "oferta";

const CL_MARKETPLACE: Record<MarketplaceRouteId, string> = {
  descubre: "/descubre",
  descubreMapa: "/descubre/mapa",
  oferta: "/oferta",
};

const SE_MARKETPLACE: Record<MarketplaceRouteId, string> = {
  descubre: "/upptack",
  descubreMapa: "/upptack/karta",
  oferta: "/erbjudande",
};

/** Segment som inte får bli en kategori- eller ortslug (krockar med kartan). */
export const MARKETPLACE_RESERVED_SEGMENTS: readonly string[] = [
  "mapa",
  "karta",
];

/** Länk till marknadsplatsen. Extra segment (kategori, ort, erbjudandets slug) läggs
 * på i ordning: `hrefMarketplace("descubre", "har", "sodermalm")` → `/upptack/har/sodermalm`. */
export function hrefMarketplace(
  id: MarketplaceRouteId,
  ...segments: readonly string[]
): string {
  const base = (market === "SE" ? SE_MARKETPLACE : CL_MARKETPLACE)[id];
  return [base, ...segments.map((x) => encodeURIComponent(x))].join("/");
}

function seMarketplacePairs(): { source: string; destination: string }[] {
  // Kartan före `:kategori`, annars fångas `/upptack/karta` som en kategori.
  return [
    { source: SE_MARKETPLACE.descubre, destination: CL_MARKETPLACE.descubre },
    {
      source: SE_MARKETPLACE.descubreMapa,
      destination: CL_MARKETPLACE.descubreMapa,
    },
    {
      source: `${SE_MARKETPLACE.descubre}/:categoria`,
      destination: `${CL_MARKETPLACE.descubre}/:categoria`,
    },
    {
      source: `${SE_MARKETPLACE.descubre}/:categoria/:ciudad`,
      destination: `${CL_MARKETPLACE.descubre}/:categoria/:ciudad`,
    },
    {
      source: `${SE_MARKETPLACE.oferta}/:slug`,
      destination: `${CL_MARKETPLACE.oferta}/:slug`,
    },
  ];
}

/** `{ source, destination }`-par: svensk slug → befintlig (spansk) sidfilsrutt. Bara SE
 * (`next.config.ts` anropar den här funktionen enbart när `NEXT_PUBLIC_MARKET=SE`). */
export function seRouteRewrites(): { source: string; destination: string }[] {
  const rutter = (Object.keys(CL_ROUTES) as RouteId[])
    .filter((id) => id !== "inicio")
    .map((id) => ({ source: SE_ROUTES[id], destination: CL_ROUTES[id] }));
  const marknadsSidor = seMarketingPagePairs();
  const legal = SE_LEGAL_SLUG_LIST.map(({ id, slug }) => ({
    source: `/legal/${slug}`,
    destination: `/legal/${id}`,
  }));
  const appRutter = (Object.keys(CL_APP_ROUTES) as AppRouteId[]).map((id) => ({
    source: toRewritePath(SE_APP_ROUTES[id]),
    destination: toRewritePath(CL_APP_ROUTES[id]),
  }));
  return [
    ...rutter,
    ...marknadsSidor,
    ...legal,
    ...appRutter,
    ...seMarketplacePairs(),
  ];
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
  const marknadsSidor = seMarketingPagePairs().map(
    ({ source, destination }) => ({
      source: destination,
      destination: source,
      permanent: true as const,
    }),
  );
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
  const marknadsplats = seMarketplacePairs().map(({ source, destination }) => ({
    source: destination,
    destination: source,
    permanent: true as const,
  }));
  return [
    ...rutter,
    ...marknadsSidor,
    ...legal,
    ...appRutter,
    ...marknadsplats,
  ];
}

/** Gamla svenska sökvägar som bytt namn → nuvarande (308), så delade länkar inte bryts.
 * Hålls utanför `seRouteRedirects()` (som är exakt motsats till rewrites). Bara SE. */
export function seLegacyRedirects(): {
  source: string;
  destination: string;
  permanent: true;
}[] {
  return [
    // "Flashtider" heter "Blixttider" på svenska.
    {
      source: "/flashtider",
      destination: SE_ROUTES.horasFlash,
      permanent: true,
    },
    // Företagsdemot hette "exempel/foretag" före omdöpningen till "Demo".
    {
      source: "/exempel/foretag",
      destination: SE_ROUTES.ejemploNegocio,
      permanent: true,
    },
    {
      source: "/ejemplo/negocio",
      destination: SE_ROUTES.ejemploNegocio,
      permanent: true,
    },
    // Branschsidor före WP-75: `/for/<slug>` och `/para/<id>` → `/branscher/<slug>`.
    ...Object.entries(SE_LEGACY_FOR_SLUGS).map(([slug, id]) => ({
      source: `/for/${slug}`,
      destination: `/branscher/${SE_RUBRO_SLUGS[id]}`,
      permanent: true as const,
    })),
    ...(Object.keys(INDUSTRIA_TO_RUBRO) as IndustriaId[]).map((legacy) => ({
      source: `/para/${legacy}`,
      destination: `/branscher/${SE_RUBRO_SLUGS[INDUSTRIA_TO_RUBRO[legacy]]}`,
      permanent: true as const,
    })),
  ];
}

/** CL: `/para/<id>` → `/rubros/<id>` (308), för delade länkar före WP-75. */
export function clLegacyRedirects(): {
  source: string;
  destination: string;
  permanent: true;
}[] {
  return [
    // Demo del negocio: antes "/ejemplo/negocio".
    {
      source: "/ejemplo/negocio",
      destination: CL_ROUTES.ejemploNegocio,
      permanent: true as const,
    },
    ...(Object.keys(INDUSTRIA_TO_RUBRO) as IndustriaId[]).map((legacy) => ({
      source: `/para/${legacy}`,
      destination: `/rubros/${CL_RUBRO_SLUGS[INDUSTRIA_TO_RUBRO[legacy]]}`,
      permanent: true as const,
    })),
  ];
}
