// Marknadsplatsen (WP-68, D-055): flaggor, kategorier och gränser. Inga texter här —
// namnen finns i `src/i18n/es-CL.descubre.ts`. Ruttsökvägarna finns i `routes.ts`.

/** Marknadsplatsen (listning, erbjudanden, karta) är på (D-060; var dold enligt
 * D-055). Kan stängas med `NEXT_PUBLIC_MARKETPLACE=0` (nödbroms, bakas in i
 * klientbygget). */
export function marketplaceEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MARKETPLACE !== "0";
}

/** Indexering (robots + sitemap) först när ägaren sätter `MARKETPLACE_INDEXABLE=1`.
 * Till dess `noindex` och inte i sitemap. */
export function marketplaceIndexable(): boolean {
  return marketplaceEnabled() && process.env.MARKETPLACE_INDEXABLE === "1";
}

/** Demoföretagen (D-043, `de00000N-…`) syns i listan lokalt/staging men inte i
 * produktion, om inte `MARKETPLACE_INCLUDE_DEMO=1`. */
export function marketplaceIncludeDemo(): boolean {
  if (process.env.MARKETPLACE_INCLUDE_DEMO === "1") return true;
  if (process.env.MARKETPLACE_INCLUDE_DEMO === "0") return false;
  return process.env.VERCEL_ENV !== "production";
}

// WP-85 (D-070, port av SE:s D-070): 16 huvudkategorier, en gemensam lista för
// rubro (`businesses.category`, `RUBRO_KEYS` i ./rubros.ts) och Descubre. De interna
// id:na är desamma som i SE (CHECK-listan på `offers.category`); namnen och
// URL-slugsen är chilenska (`src/i18n/es-CL.descubre.ts`).
export type MarketplaceCategoryId =
  | "har"
  | "barberare"
  | "naglar"
  | "fransar"
  | "hudvard"
  | "skonhet"
  | "massage"
  | "spa"
  | "halsa"
  | "holistiskt"
  | "traning"
  | "tatuering"
  | "djur"
  | "stad"
  | "fordon"
  | "ovrigt";

/** Kategorier i visningsordning (samma id:n som CHECK-listan på `offers.category`
 * och `businesses.marketplace_extra_categories`). `ovrigt` visas inte som ruta,
 * bara under "Todas". */
export const MARKETPLACE_CATEGORY_IDS: readonly MarketplaceCategoryId[] = [
  "har",
  "barberare",
  "naglar",
  "fransar",
  "hudvard",
  "skonhet",
  "massage",
  "spa",
  "halsa",
  "holistiskt",
  "traning",
  "tatuering",
  "djur",
  "stad",
  "fordon",
];

/** Alla 16, inklusive `ovrigt` (validering, väljare). */
export const ALL_MARKETPLACE_CATEGORY_IDS: readonly MarketplaceCategoryId[] = [
  ...MARKETPLACE_CATEGORY_IDS,
  "ovrigt",
];

/** URL-slug per kategori (`/descubre/<slug>`), samma ord som `/rubros/<slug>` där
 * rubron har en egen sida. */
const CATEGORY_SLUGS: Record<MarketplaceCategoryId, string> = {
  har: "peluquerias",
  barberare: "barberias",
  naglar: "unas",
  fransar: "pestanas-y-cejas",
  hudvard: "estetica",
  skonhet: "maquillaje-y-depilacion",
  massage: "masajes",
  spa: "spa",
  halsa: "kinesiologia-y-salud",
  holistiskt: "terapias-holisticas",
  traning: "entrenamiento-y-yoga",
  tatuering: "tatuajes-y-piercing",
  djur: "mascotas",
  stad: "limpieza-y-hogar",
  fordon: "autos",
  ovrigt: "otros",
};

/** Äldre slugs som fortfarande ska fungera (WP-68 hette Peluquería "cabello"). */
const CATEGORY_SLUG_ALIASES: Record<string, MarketplaceCategoryId> = {
  cabello: "har",
};

export function categorySlug(id: MarketplaceCategoryId): string {
  return CATEGORY_SLUGS[id];
}

export function categoryFromSlug(
  slug: string,
): MarketplaceCategoryId | undefined {
  return (
    (Object.keys(CATEGORY_SLUGS) as MarketplaceCategoryId[]).find(
      (id) => CATEGORY_SLUGS[id] === slug,
    ) ?? CATEGORY_SLUG_ALIASES[slug]
  );
}

export function isMarketplaceCategoryId(v: string): v is MarketplaceCategoryId {
  return (ALL_MARKETPLACE_CATEGORY_IDS as readonly string[]).includes(v);
}

/** Huvudkategorin ur företagets rubro (`businesses.category`, `RUBRO_KEYS`),
 * 1:1 (D-070). Okänd rubro → `ovrigt`. */
export function categoryForRubro(rubro: string): MarketplaceCategoryId {
  switch (rubro) {
    case "peluqueria":
      return "har";
    case "barberia":
      return "barberare";
    case "unas":
      return "naglar";
    case "cejas_pestanas":
      return "fransar";
    case "estetica":
      return "hudvard";
    case "belleza":
      return "skonhet";
    case "masajes":
      return "massage";
    case "spa":
      return "spa";
    case "kinesiologia":
      return "halsa";
    case "holistico":
      return "holistiskt";
    case "entrenamiento":
      return "traning";
    case "tatuajes":
      return "tatuering";
    case "mascotas":
      return "djur";
    case "limpieza":
      return "stad";
    case "automotriz":
      return "fordon";
    default:
      return "ovrigt";
  }
}

/** Högst så många extra kategorier per företag (samma gräns som i DB). */
export const MARKETPLACE_EXTRA_CATEGORIES_MAX = 6;

/** Högst så många comunas som ett företag som va a domicilio kan täcka. */
export const SERVICE_AREAS_MAX = 30;

/** En comunasida (`/descubre/<kategori>/<comuna>`) visas och indexeras först från så
 * många listade företag (D-070); under det visas "cerca de <comuna>". */
export const MARKETPLACE_AREA_MIN_BUSINESSES = 3;

/** Reserverat ortsegment (`/descubre/<kategori>/<ort>` ger 404 för det). Värdet är
 * oförändrat sedan tiden med två marknader (D-062). */
export const MARKETPLACE_RESERVED_AREA = "karta";

/** Avståndsfiltret (km) när besökaren delat sin position. */
export const DISTANCE_OPTIONS_KM = [1, 3, 10] as const;
export type DistanceKm = (typeof DISTANCE_OPTIONS_KM)[number];

/** Kort per sida i listan (`?sida=N`). */
export const MARKETPLACE_PAGE_SIZE = 12;

/** Blixttider i remsan. */
export const FLASH_STRIP_LIMIT = 8;

/** "Min position" (D-055): cookie med koordinater avrundade till 2 decimaler (~1 km),
 * 30 minuter, aldrig i URL, DB eller loggar. */
export const POSITION_COOKIE = "nara";
export const POSITION_MAX_AGE_S = 30 * 60;

/** Sökfältets maxlängd (enkel `ilike` i v1). */
export const SEARCH_MAX = 60;
