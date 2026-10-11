// Gemensam serverlogik för Upptäck-rutterna (WP-68): `/upptack`,
// `/upptack/<kategori>` och `/upptack/<kategori>/<ort>` (CL: `/descubre/...`,
// dold). Läser sökparametrar + positionscookien, hämtar data och bygger metadata.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import type { Migas } from "@/components/marketing/paginas/json-ld";
import { pageMetadata } from "@/components/marketing/paginas/metadata";
import {
  categoryFromSlug,
  marketplaceEnabled,
  marketplaceIndexable,
  MARKETPLACE_RESERVED_AREA,
  type MarketplaceCategoryId,
  POSITION_COOKIE,
} from "@/config/marketplace";
import { href, hrefMarketplace } from "@/config/routes";
import { descubre } from "@/i18n";
import { loadDiscover } from "@/server/marketplace/public";

import { getConsumerNav } from "./consumer-session";
import { DiscoverPage } from "./discover-page";
import {
  discoverHref,
  parseDiscoverParams,
  parsePositionCookie,
  safeDecode,
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

export function discoverMetadata(
  category: MarketplaceCategoryId | undefined,
  area: string | undefined,
): Metadata {
  const nombre = category ? t.categorias.nombres[category] : undefined;
  const titulo =
    nombre && area
      ? t.meta.categoriaCiudad({ categoria: nombre, ciudad: areaLabel(area) })
      : nombre
        ? t.meta.categoria({ categoria: nombre })
        : t.meta.titulo;
  const descripcion = nombre
    ? t.meta.categoriaDescripcion({ categoria: nombre })
    : t.meta.descripcion;
  const path = category
    ? area
      ? discoverHref({}, category).concat(`/${area}`)
      : discoverHref({}, category)
    : hrefMarketplace("descubre");
  return {
    ...pageMetadata({ titulo, descripcion, path }),
    robots: marketplaceIndexable()
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

export async function DiscoverRoute({
  category,
  area,
  searchParams,
}: {
  category: MarketplaceCategoryId | undefined;
  area: string | undefined;
  searchParams: RouteSearchParams;
}) {
  const raw = await searchParams;
  const params = parseDiscoverParams(raw);
  if (area) params.ort = area;
  const jar = await cookies();
  const position = parsePositionCookie(jar.get(POSITION_COOKIE)?.value);

  const data = await loadDiscover(
    {
      category,
      q: params.q,
      areaSlug: params.ort,
      position,
      maxKm: position ? params.km : undefined,
      flashOnly: params.blixt,
      minRating: params.betyg ? 4.5 : undefined,
      sort: params.sortera ?? "near",
      page: params.sida,
    },
    { withFlash: true },
  );

  const areaName = data.areas.find((a) => a.slug === params.ort)?.name;
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
  const heading = category
    ? {
        pre: areaName
          ? `${t.categorias.nombres[category]} ${t.hero.en}`
          : t.categorias.nombres[category],
        marca: areaName ?? t.hero.destacadoCorto,
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
