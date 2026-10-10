// Upptäck (WP-68): sökparametrar ↔ filter, och positionscookien (D-056). Rena
// funktioner utan server-beroenden — används av sidorna (server) och av
// positionsknappen (klient).
import {
  categorySlug,
  DISTANCE_OPTIONS_KM,
  type DistanceKm,
  type MarketplaceCategoryId,
  SEARCH_MAX,
} from "@/config/marketplace";
import { hrefMarketplace } from "@/config/routes";

export type MarketplaceSort = "near" | "new" | "price" | "discount";

const SORTS: readonly MarketplaceSort[] = ["near", "new", "price", "discount"];

/** Det som finns i URL:en (aldrig positionen — den ligger i cookien). */
export type DiscoverParams = {
  q?: string;
  ort?: string;
  km?: DistanceKm;
  blixt?: true;
  betyg?: true;
  sortera?: MarketplaceSort;
  sida?: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseDiscoverParams(raw: RawParams): DiscoverParams {
  const out: DiscoverParams = {};
  const q = one(raw.q)?.trim().slice(0, SEARCH_MAX);
  if (q) out.q = q;
  const ort = one(raw.ort);
  if (ort && /^[a-z0-9-]{1,60}$/.test(ort)) out.ort = ort;
  const km = Number(one(raw.km));
  if ((DISTANCE_OPTIONS_KM as readonly number[]).includes(km)) {
    out.km = km as DistanceKm;
  }
  if (one(raw.blixt) === "1") out.blixt = true;
  if (one(raw.betyg) === "1") out.betyg = true;
  const s = one(raw.sortera);
  if (s && (SORTS as readonly string[]).includes(s)) {
    out.sortera = s as MarketplaceSort;
  }
  const sida = Number(one(raw.sida));
  if (Number.isInteger(sida) && sida > 1 && sida <= 50) out.sida = sida;
  return out;
}

/** Querysträngen för `p` (utan `?` om tom). */
export function toQuery(p: DiscoverParams): string {
  const u = new URLSearchParams();
  if (p.q) u.set("q", p.q);
  if (p.ort) u.set("ort", p.ort);
  if (p.km) u.set("km", String(p.km));
  if (p.blixt) u.set("blixt", "1");
  if (p.betyg) u.set("betyg", "1");
  if (p.sortera) u.set("sortera", p.sortera);
  if (p.sida && p.sida > 1) u.set("sida", String(p.sida));
  const s = u.toString();
  return s ? `?${s}` : "";
}

/** Länk till listan (eller kartan) med kategori och parametrar. */
export function discoverHref(
  p: DiscoverParams,
  category?: MarketplaceCategoryId,
  view: "lista" | "karta" = "lista",
): string {
  if (view === "karta") {
    const qs = new URLSearchParams(toQuery({ ...p, sida: undefined }).slice(1));
    if (category) qs.set("kategori", categorySlug(category));
    const s = qs.toString();
    return `${hrefMarketplace("descubreMapa")}${s ? `?${s}` : ""}`;
  }
  const base = category
    ? hrefMarketplace("descubre", categorySlug(category))
    : hrefMarketplace("descubre");
  return `${base}${toQuery(p)}`;
}

// ---------------------------------------------------------------------------
// Positionscookien `nara` (D-056)
// ---------------------------------------------------------------------------

export type Position = { lat: number; lng: number };

/** Två decimaler (~1 km) — det enda som lämnar webbläsaren. */
export function roundPosition(p: Position): Position {
  return {
    lat: Math.round(p.lat * 100) / 100,
    lng: Math.round(p.lng * 100) / 100,
  };
}

export function formatPositionCookie(p: Position): string {
  const r = roundPosition(p);
  return `${r.lat.toFixed(2)},${r.lng.toFixed(2)}`;
}

export function parsePositionCookie(
  v: string | undefined,
): Position | undefined {
  if (!v) return undefined;
  const m = /^(-?\d{1,2}\.\d{1,2}),(-?\d{1,3}\.\d{1,2})$/.exec(v);
  if (!m) return undefined;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat, lng };
}
