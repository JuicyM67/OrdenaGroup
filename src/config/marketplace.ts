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

export type MarketplaceCategoryId =
  "har" | "naglar" | "massage" | "hudvard" | "fransar" | "ovrigt";

/** Kategorier i visningsordning (samma id:n som CHECK-listan på `offers.category`,
 * därför de interna id:na). `ovrigt` visas inte som ruta, bara under "Alla". */
export const MARKETPLACE_CATEGORY_IDS: readonly MarketplaceCategoryId[] = [
  "har",
  "naglar",
  "massage",
  "hudvard",
  "fransar",
];

/** URL-slug per kategori (`/descubre/<slug>`). */
const CATEGORY_SLUGS: Record<MarketplaceCategoryId, string> = {
  har: "cabello",
  naglar: "unas",
  massage: "masajes",
  hudvard: "estetica",
  fransar: "pestanas-y-cejas",
  ovrigt: "otros",
};

export function categorySlug(id: MarketplaceCategoryId): string {
  return CATEGORY_SLUGS[id];
}

export function categoryFromSlug(
  slug: string,
): MarketplaceCategoryId | undefined {
  return (Object.keys(CATEGORY_SLUGS) as MarketplaceCategoryId[]).find(
    (id) => CATEGORY_SLUGS[id] === slug,
  );
}

/** Förvald erbjudandekategori ur företagets bransch (`businesses.category`). */
export function categoryForRubro(rubro: string): MarketplaceCategoryId {
  switch (rubro) {
    case "barberia":
    case "peluqueria":
      return "har";
    case "unas":
      return "naglar";
    case "masajes":
    case "kinesiologia":
      return "massage";
    case "estetica":
      return "hudvard";
    case "cejas_pestanas":
      return "fransar";
    default:
      return "ovrigt";
  }
}

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
