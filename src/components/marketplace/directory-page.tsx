// Descubre — företagsfliken (WP-85, D-070): katalog över företag per kategori och
// ort i samma ram som erbjudandena (`DiscoverShell`). Kategorirutor (16), inforutan
// "Descubre växer", dagens blixttider, filter och företagskort. Under ortströskeln
// visas de närmaste företagen med en förklaring. Serverrenderad.
import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { ClientesBanner } from "@/components/marketing/clientes/clientes-page";
import type { Migas } from "@/components/marketing/paginas/json-ld";
import {
  MARKETPLACE_CATEGORY_IDS,
  MARKETPLACE_PAGE_SIZE,
  type MarketplaceCategoryId,
} from "@/config/marketplace";
import { TREATMENTS } from "@/config/treatments";
import { descubre } from "@/i18n";
import type { DirectoryData } from "@/server/marketplace/businesses";

import { BusinessCard } from "./business-card";
import { CategoryTiles } from "./category-tiles";
import type { ConsumerNav } from "./consumer-session";
import { DiscoverShell } from "./discover-shell";
import { Filters } from "./filters";
import { FlashStrip } from "./flash-strip";
import { GrowingNotice } from "./growing-notice";
import {
  discoverHref,
  flashHref,
  type DiscoverParams,
  type MarketplaceSort,
} from "./params";

const t = descubre;

const SORTS: readonly MarketplaceSort[] = ["near", "rating", "new"];

/** "Vad vill du boka?": kategorierna och behandlingslistan (WP-85). */
const SUGGESTIONS: readonly string[] = [
  ...new Set([
    ...MARKETPLACE_CATEGORY_IDS.map((id) => t.categorias.nombres[id]),
    ...TREATMENTS.map((x) => x.name),
  ]),
];

/** Så få företag att inforutan visas även med filter/kategori. */
const FEW = 6;

export function DirectoryPage({
  data,
  params,
  category,
  areaName,
  hasPosition,
  migas,
  heading,
  nav,
}: {
  data: DirectoryData;
  params: DiscoverParams;
  category: MarketplaceCategoryId | undefined;
  /** Ortens namn när sidan gäller en ort (för "nära"-texten). */
  areaName: string | undefined;
  hasPosition: boolean;
  migas: Migas;
  heading: { pre: string; marca: string };
  nav: ConsumerNav;
}) {
  const listBase = (p: DiscoverParams) => discoverHref(p, category);
  const { businesses } = data;
  const pages = Math.max(
    1,
    Math.ceil(businesses.total / MARKETPLACE_PAGE_SIZE),
  );
  const resultText =
    hasPosition && params.km
      ? t.negociosLista.resultadosKm({ n: businesses.total, km: params.km })
      : t.negociosLista.resultados({ n: businesses.total });
  const clearHref = listBase({
    ...(params.q ? { q: params.q } : {}),
    ...(params.ort ? { ort: params.ort } : {}),
  });
  const filters = (
    <Filters
      action={listBase({})}
      params={params}
      hasPosition={hasPosition}
      clearHref={clearHref}
      sorts={SORTS}
    />
  );
  const showNotice =
    businesses.total < FEW || (!category && !params.q && !params.ort);

  return (
    <DiscoverShell
      tab="negocios"
      migas={migas}
      heading={heading}
      bajada={t.negociosHero.bajada}
      searchAction={listBase({})}
      searchPlaceholder={t.negociosHero.buscar}
      suggestions={SUGGESTIONS}
      params={params}
      areas={data.areas}
      hasPosition={hasPosition}
      listBase={listBase}
      nav={nav}
    >
      {category || params.q ? null : <ClientesBanner />}

      <CategoryTiles
        counts={data.categories}
        active={category}
        params={params}
        hrefFor={(id, p) => discoverHref(p, id)}
        unit="negocios"
        total={data.allCount}
      />

      {showNotice ? <GrowingNotice /> : null}

      {params.blixt ? null : (
        <FlashStrip items={data.flash} allHref={flashHref(params)} />
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
        <aside className="hidden w-70 shrink-0 rounded-card bg-surface p-5 lg:sticky lg:top-28 lg:block">
          <h2 className="sr-only">{t.filtros.titulo}</h2>
          {filters}
        </aside>

        <section
          aria-labelledby="descubre-negocios"
          className="flex min-w-0 flex-1 flex-col gap-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h2
                id="descubre-negocios"
                className="font-display text-24 font-semibold tracking-display lg:sr-only"
              >
                {hasPosition
                  ? t.negociosLista.tituloCerca
                  : t.negociosLista.titulo}
              </h2>
              <p className="text-13 font-semibold text-muted lg:text-16">
                {resultText}
              </p>
            </div>
            <details className="group relative lg:hidden">
              <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-control bg-surface px-3.5 text-13 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
                <SlidersHorizontal
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={2}
                />
                {t.filtros.ordenes[params.sortera ?? "near"]}
              </summary>
              <div className="absolute top-full right-0 z-30 mt-2 w-72 rounded-panel bg-surface p-4 shadow-popover">
                {filters}
              </div>
            </details>
          </div>

          {data.belowThreshold && areaName ? (
            <p className="rounded-control bg-surface p-3.5 text-14 text-ink-soft">
              {t.negociosLista.cerca({ comuna: areaName })}
            </p>
          ) : null}

          {businesses.items.length === 0 ? (
            <div className="flex flex-col items-start gap-2 rounded-card bg-surface p-6">
              <h3 className="text-18 font-bold">
                {t.negociosLista.vacioTitulo}
              </h3>
              <p className="text-14 text-muted">{t.negociosLista.vacioTexto}</p>
              <Link
                href={discoverHref({})}
                className="mt-2 rounded-badge text-14 font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ink"
              >
                {t.filtros.limpiar}
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
              {businesses.items.map((b, i) => (
                <li key={b.id}>
                  <BusinessCard business={b} priority={i < 3} />
                </li>
              ))}
            </ul>
          )}

          {pages > 1 ? (
            <nav
              aria-label={t.lista.pagina({ n: businesses.page, total: pages })}
              className="flex items-center justify-between gap-3 pt-2"
            >
              {businesses.page > 1 ? (
                <Link
                  href={listBase({ ...params, sida: businesses.page - 1 })}
                  className="flex h-11 items-center rounded-control bg-surface px-4 text-14 font-bold focus-visible:outline-2 focus-visible:outline-ink"
                >
                  {t.lista.anterior}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-13 text-muted">
                {t.lista.pagina({ n: businesses.page, total: pages })}
              </span>
              {businesses.page < pages ? (
                <Link
                  href={listBase({ ...params, sida: businesses.page + 1 })}
                  className="flex h-11 items-center rounded-control bg-surface px-4 text-14 font-bold focus-visible:outline-2 focus-visible:outline-ink"
                >
                  {t.lista.siguiente}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}

          <p className="text-12 text-muted">{t.negociosLista.ranking}</p>
        </section>
      </div>
    </DiscoverShell>
  );
}
