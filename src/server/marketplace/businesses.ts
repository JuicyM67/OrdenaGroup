import "server-only";

import {
  categoryForRubro,
  MARKETPLACE_AREA_MIN_BUSINESSES,
  MARKETPLACE_PAGE_SIZE,
  marketplaceIncludeDemo,
  type MarketplaceCategoryId,
} from "@/config/marketplace";
import { marketConfig } from "@/config/market";
import { RUBRO_KEYS } from "@/config/rubros";
import { treatmentsIn } from "@/config/treatments";
import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";

import {
  type AreaOption,
  type CategoryCount,
  type FlashStripItem,
  flashStripIn,
  type GeoPoint,
  safeImageUrl,
} from "./public";

/**
 * WP-85 (D-070): Descubre som företagskatalog. Samma principer som erbjudandena
 * (D-055): service_role med EXPLICITA filter, bara kolumner som redan är publika
 * på `/[slug]`, aldrig kunddata, bara synliga recensioner (D-045).
 *
 * Ett företag listas när det är aktivt (America/Santiago), har
 * `marketplace_listed`, inte är dolt av plattformen och har en komplett profil
 * (bild, adress eller täckta orter, minst en aktiv tjänst — samma regel som
 * `missingForMarketplace`). Kategori = branschens huvudkategori eller en
 * bekräftad extra kategori. Ort = företagets geokodade område eller en täckt ort
 * (hemservice listas efter orterna, inte efter avstånd).
 */

export type BusinessSort = "near" | "new" | "rating";

export type BusinessFilters = {
  category?: MarketplaceCategoryId | undefined;
  q?: string | undefined;
  areaSlug?: string | undefined;
  position?: GeoPoint | undefined;
  maxKm?: number | undefined;
  flashOnly?: boolean | undefined;
  minRating?: number | undefined;
  sort?: BusinessSort | undefined;
  page?: number | undefined;
};

export type BusinessCard = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  logoUrl: string | null;
  category: MarketplaceCategoryId;
  areaName: string | null;
  servesAtCustomer: boolean;
  /** De första täckta orterna (hemservice). */
  serviceAreas: string[];
  rating: { average: number; count: number } | null;
  distanceKm: number | null;
  /** Antal publicerade erbjudanden (märket "Erbjudande"). */
  offerCount: number;
  /** UTC ms för dagens nästa blixttid, annars null. */
  flashToday: number | null;
};

export type BusinessPage = {
  items: BusinessCard[];
  total: number;
  page: number;
};

/** `b.category` (bransch) → huvudkategori, byggd ur `categoryForRubro` så att
 * SQL och TypeScript aldrig glider isär. */
const MAIN_CATEGORY_SQL = `(case b.category ${RUBRO_KEYS.map(
  (r) => `when '${r}' then '${categoryForRubro(r)}'`,
).join(" ")} else 'ovrigt' end)`;

function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** Gemensamma filter. `$1` = tidszon, `$2` = demo med. */
const BUSINESS_BASE = `
  from public.businesses b
  left join lateral (
    select round(avg(rv.rating)::numeric, 1)::float8 as avg, count(*)::int as n
      from public.reviews rv
     where rv.business_id = b.id and rv.hidden_at is null
  ) rv on true
  left join lateral (
    select extract(epoch from min(f.starts_at))::float8 * 1000 as next_ms
      from public.flash_slots f
     where f.business_id = b.id and f.status = 'active'
       and f.starts_at > now()
       and f.starts_at < (date_trunc('day', now() at time zone $1) + interval '1 day') at time zone $1
       and b.marketplace_flash_visible
       and private.plan_has_feature(b.plan::text, 'flash')
  ) fl on true
  left join lateral (
    select count(*)::int as n
      from public.offers o
      join public.services s on s.business_id = o.business_id and s.id = o.service_id and s.active
     where o.business_id = b.id and o.status = 'published'
       and o.offer_price_minor < s.price_clp
       and (o.sale_starts_at is null or o.sale_starts_at <= now())
       and (o.sale_ends_at is null or o.sale_ends_at > now())
       and (o.quantity_total is null or o.quantity_sold < o.quantity_total)
       and private.plan_has_feature(b.plan::text, 'offers')
  ) ofr on true
 where b.status = 'active' and b.deletion_requested_at is null
   and b.timezone = $1
   and ($2::boolean or b.id::text not like 'de00000%')
   and b.marketplace_listed and not b.marketplace_hidden
   -- Demosalongerna (D-043, id de00000…, bara när demo är med) saknar ofta egen bild;
   -- kortet visar då initialer i kategorins ton.
   and (coalesce(btrim(b.logo_url), '') <> '' or coalesce(btrim(b.cover_url), '') <> ''
        or b.id::text like 'de00000%')
   and (case when b.serves_at_customer
             then exists (select 1 from public.business_service_areas sa where sa.business_id = b.id)
             else coalesce(btrim(b.address), '') <> '' end)
   and exists (select 1 from public.services s where s.business_id = b.id and s.active)`;

const IN_AREA = (p: string): string =>
  `(b.area_slug = ${p} or exists (select 1 from public.business_service_areas sa
                                   where sa.business_id = b.id and sa.area_slug = ${p}))`;

function filterSql(f: BusinessFilters): {
  where: string;
  params: unknown[];
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
      // Hemservice har ingen egen punkt: avståndet saknas (sorteras sist).
      distanceSql = `(case when b.serves_at_customer then null
                          else private.distance_km(${lat}::numeric, ${lng}::numeric, b.lat, b.lng) end)`;
    }
    return distanceSql;
  };
  const parts: string[] = [];
  if (f.category) {
    const c = add(f.category);
    parts.push(
      `(${MAIN_CATEGORY_SQL} = ${c} or ${c} = any (b.marketplace_extra_categories))`,
    );
  }
  if (f.q) {
    const p = add(likePattern(f.q));
    // WP-85: "lashlift" hittar även företag i kategorin för behandlingen.
    const cats = [...new Set(treatmentsIn(f.q).map((t) => t.category))];
    const c = cats.length > 0 ? add(cats) : null;
    parts.push(`(b.name ilike ${p} or exists (select 1 from public.services s
                   where s.business_id = b.id and s.active and s.name ilike ${p})${
                     c
                       ? ` or ${MAIN_CATEGORY_SQL} = any (${c}::text[]) or b.marketplace_extra_categories && ${c}::text[]`
                       : ""
                   })`);
  }
  if (f.areaSlug) parts.push(IN_AREA(add(f.areaSlug)));
  if (f.position && f.maxKm) {
    parts.push(`coalesce(${distance()} <= ${add(f.maxKm)}, false)`);
  }
  if (f.flashOnly) parts.push(`fl.next_ms is not null`);
  if (f.minRating) parts.push(`rv.avg >= ${add(f.minRating)}`);
  return { where: parts.map((p) => ` and ${p}`).join(""), params, distance };
}

function orderSql(sort: BusinessSort, hasPosition: boolean): string {
  switch (sort) {
    case "rating":
      return "rv.avg desc nulls last, rv.n desc, b.created_at desc, b.id";
    case "new":
      return "b.created_at desc, b.id";
    case "near":
      return hasPosition
        ? "km asc nulls last, rv.n desc, b.id"
        : "(fl.next_ms is not null) desc, (ofr.n > 0) desc, rv.n desc, b.created_at desc, b.id";
  }
}

type Row = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
  main_category: MarketplaceCategoryId;
  area_name: string | null;
  comuna: string;
  serves_at_customer: boolean;
  areas: string[] | null;
  avg: number | null;
  n: number;
  km: number | null;
  next_ms: number | null;
  offer_count: number;
};

function toCard(r: Row): BusinessCard {
  const cover = safeImageUrl(r.cover_url);
  const logo = safeImageUrl(r.logo_url);
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    imageUrl: cover ?? logo,
    logoUrl: logo,
    category: r.main_category,
    areaName: r.area_name ?? (r.comuna.trim() || null),
    servesAtCustomer: r.serves_at_customer,
    serviceAreas: r.areas ?? [],
    rating: r.n > 0 && r.avg !== null ? { average: r.avg, count: r.n } : null,
    distanceKm: r.km === null ? null : Math.round(r.km * 10) / 10,
    offerCount: r.offer_count,
    flashToday: r.next_ms === null ? null : Math.round(r.next_ms),
  };
}

export async function listBusinessesIn(
  q: Queryable,
  f: BusinessFilters,
  limit = MARKETPLACE_PAGE_SIZE,
): Promise<BusinessPage> {
  const page = Math.max(1, Math.min(f.page ?? 1, 50));
  const { where, params, distance } = filterSql(f);
  const km = distance();
  params.push(limit, (page - 1) * limit);
  const r = await q.query<Row & { total: number }>(
    `select b.id, b.slug, b.name, b.logo_url, b.cover_url,
            ${MAIN_CATEGORY_SQL} as main_category, b.area_name, b.comuna,
            b.serves_at_customer,
            (select array_agg(sa.area_name order by sa.sort, sa.area_name)
               from (select * from public.business_service_areas x
                      where x.business_id = b.id order by x.sort limit 3) sa) as areas,
            rv.avg, rv.n, fl.next_ms, ofr.n as offer_count,
            ${km} as km, count(*) over ()::int as total
     ${BUSINESS_BASE}${where}
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

/** Antal listade företag per kategori (huvud + extra), med samma ort/position. */
export async function businessCategoryCountsIn(
  q: Queryable,
  f: Pick<BusinessFilters, "areaSlug" | "position" | "maxKm" | "q">,
): Promise<CategoryCount[]> {
  const { where, params } = filterSql(f);
  const r = await q.query<CategoryCount>(
    `select c.category, count(*)::int as count
       from (select b.id, ${MAIN_CATEGORY_SQL} as main, b.marketplace_extra_categories as extra
             ${BUSINESS_BASE}${where}) l
       cross join lateral unnest(array[l.main] || l.extra) as c(category)
      group by c.category`,
    params,
  );
  return r.rows;
}

/** Orter med listade företag (geokodat område eller täckt ort), flest först. */
export async function businessAreasIn(
  q: Queryable,
  category?: MarketplaceCategoryId,
): Promise<AreaOption[]> {
  const { where, params } = filterSql({ category });
  const r = await q.query<AreaOption>(
    `with listed as (select b.id, b.area_slug, b.area_name ${BUSINESS_BASE}${where}),
          places as (
            select id, area_slug as slug, area_name as name from listed
             where area_slug is not null and area_name is not null
            union
            select l.id, sa.area_slug, sa.area_name
              from listed l join public.business_service_areas sa on sa.business_id = l.id
          )
     select slug, min(name) as name, count(distinct id)::int as count
       from places group by slug
      order by count(distinct id) desc, slug limit 60`,
    params,
  );
  return r.rows;
}

/** Medelpunkten för de listade, geokodade företagen i en ort — "nära <ort>" när ortsidan
 * är under tröskeln. `null` om ingen i orten har koordinater. */
async function areaCenterIn(
  q: Queryable,
  areaSlug: string,
): Promise<GeoPoint | null> {
  const { where, params } = filterSql({ areaSlug });
  const r = await q.query<{ lat: string | null; lng: string | null }>(
    `select avg(b.lat)::text as lat, avg(b.lng)::text as lng
     ${BUSINESS_BASE}${where} and b.lat is not null`,
    params,
  );
  const c = r.rows[0];
  return c?.lat && c.lng ? { lat: Number(c.lat), lng: Number(c.lng) } : null;
}

export type DirectoryData = {
  businesses: BusinessPage;
  categories: CategoryCount[];
  /** Antal listade företag totalt med samma ort/position (rutan "Alla"). */
  allCount: number;
  areas: AreaOption[];
  flash: FlashStripItem[];
  /** Ortsidan har färre än tröskeln: listan är "nära orten" (D-070). */
  belowThreshold: boolean;
};

/**
 * Data för företagsfliken. Med ort: under tröskeln (färre än
 * `MARKETPLACE_AREA_MIN_BUSINESSES` i orten och kategorin) visas i stället
 * kategorin närmast ortens mitt (eller hela landet om orten saknar koordinater),
 * så att sidan aldrig är nästan tom.
 */
export function loadDirectory(f: BusinessFilters): Promise<DirectoryData> {
  return withServiceTx(async (q) => {
    let businesses = await listBusinessesIn(q, f);
    let belowThreshold = false;
    if (
      f.areaSlug &&
      !f.q &&
      businesses.total < MARKETPLACE_AREA_MIN_BUSINESSES
    ) {
      belowThreshold = true;
      const center = f.position ?? (await areaCenterIn(q, f.areaSlug));
      businesses = await listBusinessesIn(q, {
        ...f,
        areaSlug: undefined,
        position: center ?? undefined,
        maxKm: undefined,
        sort: center ? "near" : f.sort,
      });
    }
    const scope = {
      areaSlug: belowThreshold ? undefined : f.areaSlug,
      position: f.position,
      maxKm: f.maxKm,
    };
    const categories = await businessCategoryCountsIn(q, scope);
    const allCount = (await listBusinessesIn(q, scope, 1)).total;
    const areas = await businessAreasIn(q);
    const flash = await flashStripIn(q, f.position, f.areaSlug);
    return { businesses, categories, allCount, areas, flash, belowThreshold };
  });
}

/** Ort × kategori med minst tröskeln listade företag (sitemap, D-070). */
export function loadDirectorySitemap(): Promise<
  { category: MarketplaceCategoryId; areaSlug: string | null }[]
> {
  return withServiceTx(async (q) => {
    const { params } = filterSql({});
    params.push(MARKETPLACE_AREA_MIN_BUSINESSES);
    const r = await q.query<{
      category: MarketplaceCategoryId;
      area_slug: string | null;
    }>(
      `with listed as (
         select b.id, b.area_slug, ${MAIN_CATEGORY_SQL} as main, b.marketplace_extra_categories as extra
         ${BUSINESS_BASE}
       ),
       cats as (
         select id, area_slug, c as category from listed, unnest(array[main] || extra) as c
       ),
       places as (
         select id, category, area_slug from cats where area_slug is not null
         union
         select c.id, c.category, sa.area_slug
           from cats c join public.business_service_areas sa on sa.business_id = c.id
       )
       select category, null::text as area_slug from cats group by category
       union all
       select category, area_slug from places
        group by category, area_slug having count(distinct id) >= $3`,
      params,
    );
    return r.rows.map((x) => ({ category: x.category, areaSlug: x.area_slug }));
  });
}

/** Antal listade företag i en kategori och ort (ortsidans tröskel i metadata). */
export function countDirectory(
  category: MarketplaceCategoryId | undefined,
  areaSlug: string,
): Promise<number> {
  return withServiceTx(
    async (q) => (await listBusinessesIn(q, { category, areaSlug }, 1)).total,
  );
}

/** Blixttidsfliken: dagens blixttider (fler än remsan) och orterna i väljaren. */
export function loadFlashList(
  position: GeoPoint | undefined,
  areaSlug: string | undefined,
): Promise<{ items: FlashStripItem[]; areas: AreaOption[] }> {
  return withServiceTx(async (q) => ({
    items: await flashStripIn(q, position, areaSlug, 60),
    areas: await businessAreasIn(q),
  }));
}
