// Gemensam serverlogik för Descubre-rutterna (WP-68, WP-85/D-070): företag på
// `/descubre`, `/descubre/<kategori>` och `/descubre/<kategori>/<ort>`, erbjudanden på
// `/descubre/ofertas`, blixttider på `/descubre/horas-flash` (filsystemet
// `/descubre/...`). Läser sökparametrar + positionscookien, hämtar data och bygger
// metadata.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { normalize } from "@/config/treatments";

import type { Migas } from "@/components/marketing/paginas/json-ld";
import { pageMetadata } from "@/components/marketing/paginas/metadata";
import {
  ALL_MARKETPLACE_CATEGORY_IDS,
  categoryFromSlug,
  categorySlug,
  marketplaceEnabled,
  MARKETPLACE_AREA_MIN_BUSINESSES,
  marketplaceIndexable,
  MARKETPLACE_RESERVED_AREA,
  type MarketplaceCategoryId,
  POSITION_COOKIE,
} from "@/config/marketplace";
import { href, hrefMarketplace } from "@/config/routes";
import { descubre } from "@/i18n";
import {
  type BusinessSort,
  countDirectory,
  loadDirectory,
  loadFlashList,
} from "@/server/marketplace/businesses";
import { loadDiscover } from "@/server/marketplace/public";

import { getConsumerNav } from "./consumer-session";
import { DirectoryPage } from "./directory-page";
import { DiscoverPage } from "./discover-page";
import { FlashPage } from "./flash-page";
import {
  type DiscoverParams,
  discoverHref,
  offerSort,
  parseDiscoverParams,
  parsePositionCookie,
  safeDecode,
  toQuery,
} from "./params";

const t = descubre;

export type RouteSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

/** 404 när marknadsplatsen är av (alltid i CL) eller kategorin är okänd. */
export function resolveCategory(
  slug: string | undefined,
): MarketplaceCategoryId | undefined {
  if (!marketplaceEnabled()) notFound();
  if (slug === undefined) return undefined;
  const decoded = safeDecode(slug);
  const id = decoded === undefined ? undefined : categoryFromSlug(decoded);
  if (!id) notFound();
  return id;
}

export function resolveArea(slug: string | undefined): string | undefined {
  if (slug === undefined) return undefined;
  const s = safeDecode(slug);
  if (
    s === undefined ||
    !/^[a-z0-9-]{1,60}$/.test(s) ||
    s === MARKETPLACE_RESERVED_AREA
  ) {
    notFound();
  }
  return s;
}

function areaLabel(slug: string): string {
  // Snyggt nog för metadata innan datan laddats ("vasastan" → "Vasastan").
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const robotsFor = (indexable: boolean): Metadata["robots"] =>
  marketplaceIndexable() && indexable
    ? { index: true, follow: true }
    : { index: false, follow: true };

/** Företagsfliken (WP-85, D-070). En ortsida indexeras först från tröskeln. */
export async function discoverMetadata(
  category: MarketplaceCategoryId | undefined,
  area: string | undefined,
): Promise<Metadata> {
  const m = t.negociosMeta;
  const nombre = category ? t.categorias.nombres[category] : undefined;
  const titulo =
    nombre && area
      ? m.categoriaCiudad({ categoria: nombre, ciudad: areaLabel(area) })
      : nombre
        ? m.categoria({ categoria: nombre })
        : m.titulo;
  const descripcion = nombre
    ? m.categoriaDescripcion({ categoria: nombre })
    : m.descripcion;
  const path = category
    ? area
      ? discoverHref({}, category).concat(`/${area}`)
      : discoverHref({}, category)
    : hrefMarketplace("descubre");
  const indexable =
    !area ||
    (await countDirectory(category, area)) >= MARKETPLACE_AREA_MIN_BUSINESSES;
  return {
    ...pageMetadata({ titulo, descripcion, path }),
    robots: robotsFor(indexable),
  };
}

export function offersMetadata(): Metadata {
  return {
    ...pageMetadata({
      titulo: t.negociosMeta.ofertas,
      descripcion: t.meta.descripcion,
      path: hrefMarketplace("descubreOfertas"),
    }),
    robots: robotsFor(true),
  };
}

export function flashMetadata(): Metadata {
  return {
    ...pageMetadata({
      titulo: t.negociosMeta.flash,
      descripcion: t.flashLista.bajada,
      path: hrefMarketplace("descubreFlash"),
    }),
    // Blixttider ändras hela dagen — inget att indexera.
    robots: { index: false, follow: true },
  };
}

async function readContext(searchParams: RouteSearchParams) {
  const raw = await searchParams;
  const params = parseDiscoverParams(raw);
  const jar = await cookies();
  const position = parsePositionCookie(jar.get(POSITION_COOKIE)?.value);
  return { raw, params, position };
}

/** `/descubre`, `/descubre/<kategori>`, `/descubre/<kategori>/<ort>`: företag. */
export async function DiscoverRoute({
  category,
  area,
  searchParams,
}: {
  category: MarketplaceCategoryId | undefined;
  area: string | undefined;
  searchParams: RouteSearchParams;
}) {
  const { params, position } = await readContext(searchParams);
  if (area) params.ort = area;
  // WP-85: sökning på ett kategorinamn ("Massage", "frisör") → kategorisidan.
  if (params.q && !category) {
    const n = normalize(params.q);
    const hit = ALL_MARKETPLACE_CATEGORY_IDS.find(
      (id) =>
        normalize(t.categorias.nombres[id]) === n ||
        normalize(categorySlug(id)) === n,
    );
    if (hit && hit !== "ovrigt") {
      const rest: DiscoverParams = { ...params, q: undefined, sida: undefined };
      if (area) rest.ort = undefined;
      redirect(
        `${discoverHref({}, hit)}${area ? `/${area}` : ""}${toQuery(rest)}`,
      );
    }
  }
  const sort: BusinessSort =
    params.sortera === "rating" || params.sortera === "new"
      ? params.sortera
      : "near";

  const data = await loadDirectory({
    category,
    q: params.q,
    areaSlug: params.ort,
    position,
    maxKm: position ? params.km : undefined,
    flashOnly: params.blixt,
    minRating: params.betyg ? 4.5 : undefined,
    sort,
    page: params.sida,
  });

  const areaName = params.ort
    ? (data.areas.find((a) => a.slug === params.ort)?.name ??
      areaLabel(params.ort))
    : undefined;
  const migas: Migas = [
    { nombre: t.migas.inicio, href: href("inicio") },
    { nombre: t.nav.descubre, href: hrefMarketplace("descubre") },
    ...(category
      ? [
          {
            nombre: t.categorias.nombres[category],
            href: discoverHref({}, category),
          },
        ]
      : []),
    ...(category && area && areaName
      ? [{ nombre: areaName, href: `${discoverHref({}, category)}/${area}` }]
      : []),
  ];
  const h = t.negociosHero;
  const heading = category
    ? {
        pre: areaName
          ? `${t.categorias.nombres[category]} ${data.belowThreshold ? h.cerca : h.en} `
          : `${t.categorias.nombres[category]} `,
        marca: areaName ?? h.destacado,
      }
    : areaName
      ? { pre: `${h.titulo} ${h.en} `, marca: areaName }
      : { pre: `${h.titulo} `, marca: h.destacado };

  return (
    <DirectoryPage
      data={data}
      params={params}
      category={category}
      areaName={areaName}
      hasPosition={position !== undefined}
      migas={migas}
      heading={heading}
      nav={await getConsumerNav()}
    />
  );
}

/** `/descubre/ofertas[?kategori=]`: erbjudandelistan (WP-68). */
export async function OffersRoute({
  searchParams,
}: {
  searchParams: RouteSearchParams;
}) {
  const { raw, params, position } = await readContext(searchParams);
  const kategori = Array.isArray(raw.kategori) ? raw.kategori[0] : raw.kategori;
  const decoded = kategori ? safeDecode(kategori) : undefined;
  const category = decoded ? categoryFromSlug(decoded) : undefined;

  const data = await loadDiscover(
    {
      category,
      q: params.q,
      areaSlug: params.ort,
      position,
      maxKm: position ? params.km : undefined,
      flashOnly: params.blixt,
      minRating: params.betyg ? 4.5 : undefined,
      sort: offerSort(params.sortera),
      page: params.sida,
    },
    { withFlash: true },
  );

  const migas: Migas = [
    { nombre: t.migas.inicio, href: href("inicio") },
    { nombre: t.nav.descubre, href: hrefMarketplace("descubre") },
    { nombre: t.pestanas.ofertas, href: hrefMarketplace("descubreOfertas") },
  ];
  const heading = category
    ? {
        pre: `${t.categorias.nombres[category]} `,
        marca: t.hero.destacadoCorto,
      }
    : { pre: t.hero.titulo, marca: t.hero.destacado };

  return (
    <DiscoverPage
      data={data}
      params={params}
      category={category}
      hasPosition={position !== undefined}
      migas={migas}
      heading={heading}
      nav={await getConsumerNav()}
    />
  );
}

/** `/descubre/horas-flash[?ort=]`: dagens blixttider. */
export async function FlashRoute({
  searchParams,
}: {
  searchParams: RouteSearchParams;
}) {
  const { params, position } = await readContext(searchParams);
  const { items, areas } = await loadFlashList(position, params.ort);
  const migas: Migas = [
    { nombre: t.migas.inicio, href: href("inicio") },
    { nombre: t.nav.descubre, href: hrefMarketplace("descubre") },
    { nombre: t.pestanas.flash, href: hrefMarketplace("descubreFlash") },
  ];
  return (
    <FlashPage
      items={items}
      areas={areas}
      params={params}
      hasPosition={position !== undefined}
      migas={migas}
      nav={await getConsumerNav()}
    />
  );
}
