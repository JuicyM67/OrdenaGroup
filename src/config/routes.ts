// Rutt-karta (D-025). Sökvägarna är exakt filsystemsrutterna under `src/app/`
// (t.ex. `/precios` under `(marketing)/`).
//
// Interna länkar på hemsidan ska alltid gå via `href()` / `hrefIndustria()` härifrån,
// aldrig hårdkodade `/precios`-strängar. `/login` är undantaget (auth-route, rörs
// inte här).
import { marketplaceEnabled } from "./marketplace";

export type RouteId =
  | "inicio"
  | "precios"
  | "funcionalidades"
  | "horasFlash"
  | "ventajas"
  | "preguntas"
  | "contacto"
  | "ejemploNegocio"
  | "paraClientes";

/** Samma id:n som i `SITIO_PARA_INDUSTRIAS` (`src/i18n/es-CL.marketing.ts`). */
export type IndustriaId =
  "barberias" | "peluquerias" | "estetica" | "kinesiologia";

import { hrefLegal, type LegalDocId } from "./legal-routes";

export { hrefLegal, type LegalDocId };

/** Exakt filsystemsrutten under `(marketing)/`. */
const ROUTES: Record<RouteId, string> = {
  inicio: "/",
  precios: "/precios",
  funcionalidades: "/funcionalidades",
  horasFlash: "/horas-flash",
  ventajas: "/ventajas",
  preguntas: "/preguntas",
  contacto: "/contacto",
  ejemploNegocio: "/demo/negocio",
  // Landningssidan för konsumentkontot (med marknadsplatsen, D-060).
  paraClientes: "/para-clientes",
};

/** Länk till en av marknadssidorna. `hash` läggs på utan `#` (t.ex.
 * `href("funcionalidades", "agenda")` → `/funcionalidades#agenda`). */
export function href(id: RouteId, hash?: string): string {
  const path = ROUTES[id];
  return hash ? `${path}#${hash}` : path;
}

// ---------------------------------------------------------------------------
// Funktionssidor och branschsidor (WP-75). Filsystemets (CL) sökvägar:
//   /funcionalidades/<slug>   (+ /horas-flash och /migracion som egna sidfiler)
//   /rubros och /rubros/<slug>
// ---------------------------------------------------------------------------

export type FuncionId =
  | "reservas"
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
  "resenas",
  "horasFlash",
  "listaEspera",
  "recordatorios",
  "agenda",
  "caja",
  "migracion",
];

const FUNCION_PATHS: Record<FuncionId, string> = {
  reservas: "/funcionalidades/reservas-online",
  resenas: "/funcionalidades/resenas",
  horasFlash: "/horas-flash",
  listaEspera: "/funcionalidades/lista-de-espera",
  recordatorios: "/funcionalidades/recordatorios",
  agenda: "/funcionalidades/agenda-y-equipo",
  caja: "/funcionalidades/caja-e-informes",
  migracion: "/migracion",
};

export function hrefFuncion(id: FuncionId): string {
  return FUNCION_PATHS[id];
}

/** Sista segmentet i sökvägen för funktioner under `/funcionalidades/[funcion]`. */
export function funcionFromParam(slug: string): FuncionId | undefined {
  return FUNCION_IDS.find(
    (id) => FUNCION_PATHS[id] === `/funcionalidades/${slug}`,
  );
}

/** Param-värdena (slugs) för `/funcionalidades/[funcion]`. */
export function funcionParamSlugs(): string[] {
  return FUNCION_IDS.filter((id) =>
    FUNCION_PATHS[id].startsWith("/funcionalidades/"),
  ).map((id) => FUNCION_PATHS[id].slice("/funcionalidades/".length));
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

/** Sista segmentet i `/rubros/<slug>` (filsystemet). De fyra första branscherna behåller
 * sina gamla `/para/<slug>`-id:n. */
const RUBRO_SLUGS: Record<RubroId, string> = {
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

export function hrefRubros(): string {
  return "/rubros";
}

export function hrefRubro(id: RubroId): string {
  return `/rubros/${RUBRO_SLUGS[id]}`;
}

export function rubroFromParam(slug: string): RubroId | undefined {
  return RUBRO_IDS.find((id) => RUBRO_SLUGS[id] === slug);
}

export function rubroParamSlugs(): string[] {
  return RUBRO_IDS.map((id) => RUBRO_SLUGS[id]);
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

/** Alla publika, indexerbara sökvägar (sitemap.xml). */
export function sitemapPaths(): string[] {
  const paths = [
    href("inicio"),
    href("precios"),
    href("funcionalidades"),
    href("ventajas"),
    href("preguntas"),
    href("contacto"),
    ...(marketplaceEnabled() ? [href("paraClientes")] : []),
    ...FUNCION_IDS.map(hrefFuncion),
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
// de publika token-sidorna (`/baja/[token]`). Sökvägarna är filsystemets
// (`src/app/(app)/app/*`, `src/app/(app-public)/app/*`, `src/app/app/*`,
// `src/app/baja/*`). `/v/[token]` och `/r/[token]` är redan korta koder — de
// finns INTE i den här tabellen.
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
  | "appOfertas"
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
  | "appAjustesPlan"
  | "appAjustesWidgets"
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
  plan: "appAjustesPlan",
  widgets: "appAjustesWidgets",
} as const satisfies Record<string, AppRouteId>;

/** Filsystemets sökväg, med `[id]`/`[token]` som platshållare för dynamiska
 * segment (bara ett per rutt). */
const APP_ROUTES: Record<AppRouteId, string> = {
  appInicio: "/app/inicio",
  appAgenda: "/app/agenda",
  appHoy: "/app/hoy",
  appClientes: "/app/clientes",
  appClientesResenas: "/app/clientes/resenas",
  appClienteDetail: "/app/clientes/[id]",
  appClientesUtskick: "/app/clientes/utskick",
  appClientesUtskickNytt: "/app/clientes/utskick/nytt",
  appCaja: "/app/caja",
  appCajaInformes: "/app/caja/informes",
  appFlash: "/app/flash",
  // WP-70 (D-056): erbjudanderedigeraren.
  appOfertas: "/app/ofertas",
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
  appAjustesPlan: "/app/ajustes/plan",
  // WP-82 (D-067): widgets för företagets egen hemsida.
  appAjustesWidgets: "/app/ajustes/widgets",
  appSolicitud: "/app/solicitudes/[id]",
  appInvitacion: "/app/invitacion/[token]",
  appBienvenida: "/app/bienvenida/[token]",
  appOnboarding: "/app/onboarding",
  baja: "/baja/[token]",
  resena: "/resena/[token]",
};

/** Länk till en app-rutt. `param` ersätter ruttens enda dynamiska segment
 * (`[id]`/`[token]`) om den har ett — hash/query läggs på av anroparen (t.ex.
 * `` `${appHref("appAgenda")}?vista=dia&fecha=${d}` ``, se WP-58-planen). */
export function appHref(id: AppRouteId, param?: string): string {
  const path = APP_ROUTES[id];
  return param === undefined ? path : path.replace(/\[(?:id|token)\]/, param);
}

function stripDynamicSegment(path: string): string {
  return path.replace(/\[(?:id|token)\]$/, "");
}

/** Prefixet (utan själva id/token-delen) för en dynamisk app-rutt (`src/proxy.ts`). */
export function appRoutePrefix(id: AppRouteId): string {
  return stripDynamicSegment(APP_ROUTES[id]);
}

// ---------------------------------------------------------------------------
// Kundkonton (WP-67, D-054): konsumentens egna sidor, filsystemets sökvägar
// (`src/app/(consumer)/cuenta/*`).
// ---------------------------------------------------------------------------
export type CuentaRouteId =
  | "cuenta"
  | "cuentaIngresar"
  | "cuentaReservas"
  | "cuentaFavoritos"
  | "cuentaPrivacidad"
  | "cuentaResena";

const CUENTA_ROUTES: Record<CuentaRouteId, string> = {
  cuenta: "/cuenta",
  cuentaIngresar: "/cuenta/ingresar",
  cuentaReservas: "/cuenta/reservas",
  cuentaFavoritos: "/cuenta/favoritos",
  cuentaPrivacidad: "/cuenta/privacidad",
  cuentaResena: "/cuenta/resena/[id]",
};

/** Länk till en kontosida. `param` ersätter `[id]` (bara `cuentaResena`). */
export function cuentaHref(id: CuentaRouteId, param?: string): string {
  const path = CUENTA_ROUTES[id];
  return param === undefined ? path : path.replace("[id]", param);
}

// ---------------------------------------------------------------------------
// Marknadsplatsen (WP-68, D-055, D-060). Filsystemet: `src/app/(consumer)/descubre/**`
// och `src/app/(consumer)/oferta/[slug]`. Kategorislugsen finns i `marketplace.ts`.
// ---------------------------------------------------------------------------
export type MarketplaceRouteId = "descubre" | "descubreMapa" | "oferta";

const MARKETPLACE_ROUTES: Record<MarketplaceRouteId, string> = {
  descubre: "/descubre",
  descubreMapa: "/descubre/mapa",
  oferta: "/oferta",
};

/** Kontots rotprefix (`src/proxy.ts`: allt under det kräver inloggning). */
export const CUENTA_ROOT: string = CUENTA_ROUTES.cuenta;

/** Kontots inloggningssida (undantaget i `src/proxy.ts`). */
export const CUENTA_INGRESAR_PATH: string = CUENTA_ROUTES.cuentaIngresar;

/** Länk till marknadsplatsen. Extra segment (kategori, ort, erbjudandets slug) läggs
 * på i ordning: `hrefMarketplace("descubre", "cabello", "providencia")` →
 * `/descubre/cabello/providencia`. */
export function hrefMarketplace(
  id: MarketplaceRouteId,
  ...segments: readonly string[]
): string {
  const base = MARKETPLACE_ROUTES[id];
  return [base, ...segments.map((x) => encodeURIComponent(x))].join("/");
}

/** `/para/<id>` → `/rubros/<id>` (308), för delade länkar före WP-75. */
export function clLegacyRedirects(): {
  source: string;
  destination: string;
  permanent: true;
}[] {
  return [
    // Demo del negocio: antes "/ejemplo/negocio".
    {
      source: "/ejemplo/negocio",
      destination: ROUTES.ejemploNegocio,
      permanent: true as const,
    },
    ...(Object.keys(INDUSTRIA_TO_RUBRO) as IndustriaId[]).map((legacy) => ({
      source: `/para/${legacy}`,
      destination: `/rubros/${RUBRO_SLUGS[INDUSTRIA_TO_RUBRO[legacy]]}`,
      permanent: true as const,
    })),
  ];
}
