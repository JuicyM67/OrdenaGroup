import "server-only";

import {
  FLASH_STRIP_LIMIT,
  MARKETPLACE_PAGE_SIZE,
  marketplaceIncludeDemo,
  type MarketplaceCategoryId,
} from "@/config/marketplace";
import { marketConfig } from "@/config/market";
import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";
import { flashPrice } from "@/server/flash/public";

/**
 * WP-68 (D-055): marknadsplatsens publika läsning. Körs som service_role
 * (som resten av de publika sidorna, aldrig anon) med EXPLICITA filter i
 * varje fråga: publicerat erbjudande inom säljfönstret och inte slutsålt,
 * aktiv tjänst, aktivt företag (inte `frozen`, ingen radering begärd) i
 * installationens marknad (tidszon; en databas per marknad i prod, D-025,
 * men lokalt delar CL och SE databas). Bara kolumner som är publika på
 * `/[slug]` ändå — aldrig kunddata. Recensioner: bara synliga (D-045).
 */

export type GeoPoint = { lat: number; lng: number };

export type MarketplaceSort = "near" | "new" | "price" | "discount";

export type OfferFilters = {
  category?: MarketplaceCategoryId | undefined;
  /** Fritext (titel eller företagsnamn), redan trimmad. */
  q?: string | undefined;
  areaSlug?: string | undefined;
  position?: GeoPoint | undefined;
  maxKm?: number | undefined;
  flashOnly?: boolean | undefined;
  /** T.ex. 4.5. */
  minRating?: number | undefined;
  sort?: MarketplaceSort | undefined;
  /** 1-baserad. */
  page?: number | undefined;
};

export type OfferCard = {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  category: MarketplaceCategoryId;
  regularMinor: number;
  priceMinor: number;
  discountPct: number;
  business: {
    name: string;
    slug: string;
    areaName: string | null;
    lat: number | null;
    lng: number | null;
  };
  rating: { average: number; count: number } | null;
  distanceKm: number | null;
  /** UTC ms för dagens nästa blixttid hos företaget (badge), annars null. */
  flashToday: number | null;
};

export type OfferPage = { items: OfferCard[]; total: number; page: number };

/** Rabatt i hela procent (avrundad nedåt — vi lovar aldrig mer än det är). */
export function discountPct(regular: number, price: number): number {
  if (regular <= 0 || price >= regular) return 0;
  return Math.floor(((regular - price) * 100) / regular);
}

/** `%`, `_` och `\` i sökningen ska matcha bokstavligt i `ilike`. */
function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** Gemensamma filter för publicerade erbjudanden. `$1` = tidszon, `$2` = demo med. */
const OFFER_BASE = `
  from public.offers o
  join public.businesses b on b.id = o.business_id
  join public.services s on s.business_id = o.business_id and s.id = o.service_id and s.active
  left join lateral (
    select round(avg(rv.rating)::numeric, 1)::float8 as avg, count(*)::int as n
      from public.reviews rv
     where rv.business_id = o.business_id and rv.hidden_at is null
  ) rv on true
  left join lateral (
    select extract(epoch from min(f.starts_at))::float8 * 1000 as next_ms
      from public.flash_slots f
     where f.business_id = o.business_id and f.status = 'active'
       and f.starts_at > now()
       and f.starts_at < (date_trunc('day', now() at time zone $1) + interval '1 day') at time zone $1
       and b.marketplace_flash_visible
       and private.plan_has_feature(b.plan::text, 'flash')
  ) fl on true
 where o.status = 'published'
   and (o.sale_starts_at is null or o.sale_starts_at <= now())
   and (o.sale_ends_at is null or o.sale_ends_at > now())
   and (o.quantity_total is null or o.quantity_sold < o.quantity_total)
   and b.status = 'active' and b.deletion_requested_at is null
   and b.timezone = $1
   and ($2::boolean or b.id::text not like 'de00000%')`;

type OfferRow = {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  category: MarketplaceCategoryId;
  regular_price_minor: number;
  offer_price_minor: number;
  business_name: string;
  business_slug: string;
  area_name: string | null;
  cover_url: string | null;
  lat: string | null;
  lng: string | null;
  avg: number | null;
  n: number;
  km: number | null;
  next_ms: number | null;
};

const OFFER_COLUMNS = `
  o.id, o.slug, o.title, o.image_url, o.category, o.regular_price_minor, o.offer_price_minor,
  b.name as business_name, b.slug as business_slug, b.area_name, b.cover_url,
  b.lat::text as lat, b.lng::text as lng, rv.avg, rv.n, fl.next_ms`;

function toCard(r: OfferRow): OfferCard {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    imageUrl: r.image_url ?? r.cover_url,
    category: r.category,
    regularMinor: r.regular_price_minor,
    priceMinor: r.offer_price_minor,
    discountPct: discountPct(r.regular_price_minor, r.offer_price_minor),
    business: {
      name: r.business_name,
      slug: r.business_slug,
      areaName: r.area_name,
      lat: r.lat === null ? null : Number(r.lat),
      lng: r.lng === null ? null : Number(r.lng),
    },
    rating: r.n > 0 && r.avg !== null ? { average: r.avg, count: r.n } : null,
    distanceKm: r.km === null ? null : Math.round(r.km * 10) / 10,
    flashToday: r.next_ms === null ? null : Math.round(r.next_ms),
  };
}

/** Bygger WHERE-tilläggen och parametrarna ($1/$2 är bas-filtrets). */
function filterSql(f: OfferFilters): {
  where: string;
  params: unknown[];
  /** Avståndsuttrycket; lägger till positionens parametrar först när det används. */
  distance: () => string;
} {
  const params: unknown[] = [marketConfig.timeZone, marketplaceIncludeDemo()];
  const add = (v: unknown): string => {
    params.push(v);
    return `$${params.length}`;
  };
  let distanceSql: string | undefined;
  const distance = (): string => {
    if (!f.position) return "null::float8";
    if (distanceSql === undefined) {
      const lat = add(f.position.lat);
      const lng = add(f.position.lng);
      distanceSql = `private.distance_km(${lat}::numeric, ${lng}::numeric, b.lat, b.lng)`;
    }
    return distanceSql;
  };
  const parts: string[] = [];
  if (f.category) parts.push(`o.category = ${add(f.category)}`);
  if (f.q) {
    const p = add(likePattern(f.q));
    parts.push(
      `(o.title ilike ${p} or b.name ilike ${p} or s.name ilike ${p})`,
    );
  }
  if (f.areaSlug) parts.push(`b.area_slug = ${add(f.areaSlug)}`);
  if (f.position && f.maxKm) parts.push(`${distance()} <= ${add(f.maxKm)}`);
  if (f.flashOnly) parts.push(`fl.next_ms is not null`);
  if (f.minRating) parts.push(`rv.avg >= ${add(f.minRating)}`);
  return {
    where: parts.map((p) => ` and ${p}`).join(""),
    params,
    distance,
  };
}

function orderSql(sort: MarketplaceSort, hasPosition: boolean): string {
  // Sekundärnyckel `o.id` gör pagineringen stabil vid lika värden.
  switch (sort) {
    case "price":
      return "o.offer_price_minor asc, o.id";
    case "discount":
      return "(o.regular_price_minor - o.offer_price_minor)::float8 / o.regular_price_minor desc, o.id";
    case "new":
      return "o.published_at desc nulls last, o.id";
    case "near":
      return hasPosition
        ? "km asc nulls last, o.published_at desc nulls last, o.id"
        : "o.published_at desc nulls last, o.id";
  }
}

export async function listOffersIn(
  q: Queryable,
  f: OfferFilters,
  limit = MARKETPLACE_PAGE_SIZE,
): Promise<OfferPage> {
  const page = Math.max(1, Math.min(f.page ?? 1, 50));
  const { where, params, distance } = filterSql(f);
  const km = distance();
  params.push(limit, (page - 1) * limit);
  const r = await q.query<OfferRow & { total: number }>(
    `select ${OFFER_COLUMNS}, ${km} as km, count(*) over ()::int as total
     ${OFFER_BASE}${where}
     order by ${orderSql(f.sort ?? "near", f.position !== undefined)}
     limit $${params.length - 1} offset $${params.length}`,
    params,
  );
  return {
    items: r.rows.map(toCard),
    total: r.rows[0]?.total ?? 0,
    page,
  };
}

export function listOffers(
  f: OfferFilters,
  limit?: number,
): Promise<OfferPage> {
  return withServiceTx((q) => listOffersIn(q, f, limit));
}

export type CategoryCount = { category: MarketplaceCategoryId; count: number };

/** Antal publicerade erbjudanden per kategori (rutorna), med samma ort/position. */
export async function categoryCountsIn(
  q: Queryable,
  f: Pick<OfferFilters, "areaSlug" | "position" | "maxKm">,
): Promise<CategoryCount[]> {
  const { where, params } = filterSql(f);
  const r = await q.query<{ category: MarketplaceCategoryId; count: number }>(
    `select o.category, count(*)::int as count ${OFFER_BASE}${where} group by o.category`,
    params,
  );
  return r.rows;
}

export type AreaOption = { slug: string; name: string; count: number };

/** Orter (stadsdelar) som har minst ett publicerat erbjudande. */
export async function areasIn(q: Queryable): Promise<AreaOption[]> {
  const { params } = filterSql({});
  const r = await q.query<{ slug: string; name: string; count: number }>(
    `select b.area_slug as slug, min(b.area_name) as name, count(*)::int as count
     ${OFFER_BASE} and b.area_slug is not null
     group by b.area_slug order by count(*) desc, b.area_slug limit 40`,
    params,
  );
  return r.rows;
}

export type FlashStripItem = {
  id: string;
  /** UTC ms. */
  start: number;
  discountPct: number;
  serviceName: string;
  regularMinor: number;
  priceMinor: number;
  businessName: string;
  businessSlug: string;
  areaName: string | null;
  distanceKm: number | null;
};

/** Dagens kommande blixttider (D-005) hos företag som visar dem i Upptäck. */
export async function flashStripIn(
  q: Queryable,
  position: GeoPoint | undefined,
  areaSlug?: string,
  limit = FLASH_STRIP_LIMIT,
): Promise<FlashStripItem[]> {
  const params: unknown[] = [marketConfig.timeZone, marketplaceIncludeDemo()];
  let distance = "null::float8";
  if (position) {
    params.push(position.lat, position.lng);
    distance = `private.distance_km($3::numeric, $4::numeric, b.lat, b.lng)`;
  }
  let area = "";
  if (areaSlug) {
    params.push(areaSlug);
    area = ` and b.area_slug = $${params.length}`;
  }
  params.push(limit);
  const r = await q.query<{
    id: string;
    start_ms: number;
    pct: number;
    service_name: string;
    price: number;
    business_name: string;
    business_slug: string;
    area_name: string | null;
    km: number | null;
  }>(
    `select f.id, extract(epoch from f.starts_at)::float8 * 1000 as start_ms,
            f.discount_pct::int as pct, sv.name as service_name, sv.price_clp as price,
            b.name as business_name, b.slug as business_slug, b.area_name,
            ${distance} as km
       from public.flash_slots f
       join public.businesses b on b.id = f.business_id
       join lateral (
         select s.name, s.price_clp
           from public.services s
          where s.business_id = f.business_id and s.active and s.price_clp > 0
            and (f.service_ids is null or s.id = any (f.service_ids))
          order by s.sort, s.name
          limit 1
       ) sv on true
      where f.status = 'active'
        and f.starts_at > now()
        and f.starts_at < (date_trunc('day', now() at time zone $1) + interval '1 day') at time zone $1
        and b.status = 'active' and b.deletion_requested_at is null
        and b.timezone = $1
        and ($2::boolean or b.id::text not like 'de00000%')
        and b.marketplace_flash_visible
        and private.plan_has_feature(b.plan::text, 'flash')${area}
      order by ${position ? "km asc nulls last, " : ""}f.starts_at, f.id
      limit $${params.length}`,
    params,
  );
  return r.rows.map((x) => ({
    id: x.id,
    start: Math.round(x.start_ms),
    discountPct: x.pct,
    serviceName: x.service_name,
    regularMinor: x.price,
    priceMinor: flashPrice(x.price, x.pct),
    businessName: x.business_name,
    businessSlug: x.business_slug,
    areaName: x.area_name,
    distanceKm: x.km === null ? null : Math.round(x.km * 10) / 10,
  }));
}

export type DiscoverData = {
  offers: OfferPage;
  categories: CategoryCount[];
  areas: AreaOption[];
  flash: FlashStripItem[];
};

export function loadDiscover(
  f: OfferFilters,
  opts: { withFlash: boolean },
): Promise<DiscoverData> {
  return withServiceTx(async (q) => {
    const offers = await listOffersIn(q, f);
    const categories = await categoryCountsIn(q, f);
    const areas = await areasIn(q);
    const flash = opts.withFlash
      ? await flashStripIn(q, f.position, f.areaSlug)
      : [];
    return { offers, categories, areas, flash };
  });
}

// ---------------------------------------------------------------------------
// Erbjudandesidan
// ---------------------------------------------------------------------------

export type OfferDetail = OfferCard & {
  description: string | null;
  includes: string[];
  terms: string | null;
  validMonths: number;
  currency: string;
  serviceName: string;
  durationMin: number;
  publishedAt: string | null;
  saleEndsAt: string | null;
  business: OfferCard["business"] & {
    address: string | null;
    comuna: string;
    logoUrl: string | null;
  };
  review: {
    rating: number;
    comment: string;
    displayName: string | null;
    reply: string | null;
  } | null;
  more: OfferCard[];
};

export async function loadOffer(
  slug: string,
): Promise<OfferDetail | undefined> {
  if (!/^[a-z0-9-]{1,90}$/.test(slug)) return undefined;
  return withServiceTx(async (q) => {
    const { params } = filterSql({});
    params.push(slug);
    const r = await q.query<
      OfferRow & {
        business_id: string;
        description: string | null;
        includes: string[];
        terms: string | null;
        valid_months: number;
        currency: string;
        service_name: string;
        duration_min: number;
        published_at: string | null;
        sale_ends_at: string | null;
        address: string | null;
        comuna: string;
        logo_url: string | null;
      }
    >(
      `select ${OFFER_COLUMNS}, null::float8 as km, o.business_id,
              o.description, o.includes, o.terms, o.valid_months, o.currency,
              s.name as service_name, s.duration_min, o.published_at, o.sale_ends_at,
              b.address, b.comuna, b.logo_url
       ${OFFER_BASE} and o.slug = $3`,
      params,
    );
    const row = r.rows[0];
    if (!row) return undefined;

    // En verifierad recension med text (D-045), helst en med företagets svar.
    const rv = await q.query<{
      rating: number;
      comment: string;
      display_name: string | null;
      reply: string | null;
    }>(
      `select rating, comment, display_name, reply
         from public.reviews
        where business_id = $1 and hidden_at is null
          and comment is not null and rating >= 4
        order by rating desc, (reply is not null) desc, created_at desc
        limit 1`,
      [row.business_id],
    );

    const more = await q.query<OfferRow>(
      `select ${OFFER_COLUMNS}, null::float8 as km
       ${OFFER_BASE} and o.business_id = $3 and o.slug <> $4
       order by o.published_at desc nulls last, o.id limit 3`,
      [params[0], params[1], row.business_id, slug],
    );

    const card = toCard(row);
    const review = rv.rows[0];
    return {
      ...card,
      description: row.description,
      includes: row.includes,
      terms: row.terms,
      validMonths: row.valid_months,
      currency: row.currency,
      serviceName: row.service_name,
      durationMin: row.duration_min,
      publishedAt: row.published_at
        ? new Date(row.published_at).toISOString()
        : null,
      saleEndsAt: row.sale_ends_at
        ? new Date(row.sale_ends_at).toISOString()
        : null,
      business: {
        ...card.business,
        address: row.address,
        comuna: row.comuna,
        logoUrl: row.logo_url,
      },
      review: review
        ? {
            rating: review.rating,
            comment: review.comment,
            displayName: review.display_name,
            reply: review.reply,
          }
        : null,
      more: more.rows.map(toCard),
    };
  });
}

/** Sitemap: alla publicerade erbjudanden + kategori×ort-kombinationer. */
export function loadSitemapEntries(): Promise<{
  offers: { slug: string; updatedAt: string }[];
  combos: { category: MarketplaceCategoryId; areaSlug: string | null }[];
}> {
  return withServiceTx(async (q) => {
    const { params } = filterSql({});
    const offers = await q.query<{ slug: string; updated_at: string }>(
      `select o.slug, o.updated_at ${OFFER_BASE} order by o.slug limit 5000`,
      params,
    );
    const combos = await q.query<{
      category: MarketplaceCategoryId;
      area_slug: string | null;
    }>(`select distinct o.category, b.area_slug ${OFFER_BASE}`, params);
    return {
      offers: offers.rows.map((x) => ({
        slug: x.slug,
        updatedAt: new Date(x.updated_at).toISOString(),
      })),
      combos: combos.rows.map((x) => ({
        category: x.category,
        areaSlug: x.area_slug,
      })),
    };
  });
}
