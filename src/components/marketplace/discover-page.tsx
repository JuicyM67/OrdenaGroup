// Descubre — erbjudandefliken (WP-68, riktning A "lista först": Main.dc.html mobil,
// Desktop.dc.html dator; WP-85: i det gemensamma skalet `DiscoverShell`, på
// `/descubre/ofertas?kategori=`). Pastellrutor och vita kort. Serverrenderad; den
// enda klientön är "Min position" (position-button.tsx).
import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { cn } from "@/components/ui/cn";
import {
  categorySlug,
  MARKETPLACE_PAGE_SIZE,
  type MarketplaceCategoryId,
} from "@/config/marketplace";
import { descubre } from "@/i18n";
import type { DiscoverData } from "@/server/marketplace/public";

import type { Migas } from "@/components/marketing/paginas/json-ld";

import type { ConsumerNav } from "./consumer-session";
import { DiscoverShell } from "./discover-shell";
import { CategoryTiles } from "./category-tiles";
import { Filters } from "./filters";
import { FlashStrip } from "./flash-strip";
import { OfferCard } from "./offer-card";
import { favoriteFor } from "./favorite";
import { discoverHref, type DiscoverParams } from "./params";
import { ViewToggle } from "./view-toggle";

const t = descubre;

export function DiscoverPage({
  data,
  params,
  category,
  hasPosition,
  migas,
  heading,
  nav,
}: {
  data: DiscoverData;
  params: DiscoverParams;
  category: MarketplaceCategoryId | undefined;
  hasPosition: boolean;
  migas: Migas;
  /** H1 i två delar (andra delen får lime-markering). */
  heading: { pre: string; marca: string };
  nav: ConsumerNav;
}) {
  // Kategorin ligger i `?kategori=` på erbjudandefliken; GET-formulären skickar den
  // som dolt fält (formulärets action-adress får ingen frågesträng).
  const action = discoverHref({}, undefined, "ofertas");
  const hidden = category ? { kategori: categorySlug(category) } : undefined;
  const listBase = (p: DiscoverParams) => discoverHref(p, category, "ofertas");
  const { offers } = data;
  const pages = Math.max(1, Math.ceil(offers.total / MARKETPLACE_PAGE_SIZE));
  const resultText =
    hasPosition && params.km
      ? t.lista.resultadosKm({ n: offers.total, km: params.km })
      : t.lista.resultados({ n: offers.total });
  const flashHref = listBase({ ...params, blixt: true, sida: undefined });
  const clearHref = listBase({
    ...(params.q ? { q: params.q } : {}),
    ...(params.ort ? { ort: params.ort } : {}),
  });
  return (
    <DiscoverShell
      tab="ofertas"
      migas={migas}
      heading={heading}
      bajada={t.hero.bajada}
      searchAction={action}
      searchHidden={hidden}
      params={params}
      areas={data.areas}
      hasPosition={hasPosition}
      listBase={listBase}
      nav={nav}
    >
      <CategoryTiles
        counts={data.categories}
        active={category}
        params={params}
        hrefFor={(id, p) => discoverHref(p, id, "ofertas")}
      />

      {params.blixt ? null : (
        <FlashStrip items={data.flash} allHref={flashHref} />
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
        <aside className="hidden w-70 shrink-0 rounded-card bg-surface p-5 lg:sticky lg:top-28 lg:block">
          <h2 className="sr-only">{t.filtros.titulo}</h2>
          <Filters
            action={action}
            extraHidden={hidden}
            params={params}
            hasPosition={hasPosition}
            clearHref={clearHref}
          />
        </aside>

        <section
          aria-labelledby="upptack-resultat"
          className="flex min-w-0 flex-1 flex-col gap-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h2
                id="upptack-resultat"
                className="font-display text-24 font-semibold tracking-display lg:sr-only"
              >
                {hasPosition ? t.lista.tituloCerca : t.lista.titulo}
              </h2>
              <p className="text-13 font-semibold text-muted lg:text-16">
                {resultText}
              </p>
            </div>
            <ViewToggle
              active="lista"
              listHref={listBase(params)}
              mapHref={discoverHref(params, category, "karta")}
              className="hidden lg:flex"
            />
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
                <Filters
                  action={action}
                  extraHidden={hidden}
                  params={params}
                  hasPosition={hasPosition}
                  clearHref={clearHref}
                />
              </div>
            </details>
          </div>

          {offers.items.length === 0 ? (
            <div className="flex flex-col items-start gap-2 rounded-card bg-surface p-6">
              <h3 className="text-18 font-bold">{t.lista.vacioTitulo}</h3>
              <p className="text-14 text-muted">{t.lista.vacioTexto}</p>
              <Link
                href={discoverHref({}, undefined, "ofertas")}
                className="mt-2 rounded-badge text-14 font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ink"
              >
                {t.filtros.limpiar}
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
              {offers.items.map((o, i) => (
                <li key={o.id}>
                  <div
                    className={cn(i === 0 ? "" : "hidden sm:block", "h-full")}
                  >
                    <OfferCard
                      offer={o}
                      variant={i === 0 ? "hero" : "grid"}
                      priority={i < 3}
                      favorite={favoriteFor(nav, o.business.id, action)}
                    />
                  </div>
                  {i === 0 ? null : (
                    <div className="sm:hidden">
                      <OfferCard offer={o} variant="row" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {pages > 1 ? (
            <nav
              aria-label={t.lista.pagina({ n: offers.page, total: pages })}
              className="flex items-center justify-between gap-3 pt-2"
            >
              {offers.page > 1 ? (
                <Link
                  href={listBase({ ...params, sida: offers.page - 1 })}
                  className="flex h-11 items-center rounded-control bg-surface px-4 text-14 font-bold focus-visible:outline-2 focus-visible:outline-ink"
                >
                  {t.lista.anterior}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-13 text-muted">
                {t.lista.pagina({ n: offers.page, total: pages })}
              </span>
              {offers.page < pages ? (
                <Link
                  href={listBase({ ...params, sida: offers.page + 1 })}
                  className="flex h-11 items-center rounded-control bg-surface px-4 text-14 font-bold focus-visible:outline-2 focus-visible:outline-ink"
                >
                  {t.lista.siguiente}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}

          <p className="text-12 text-muted">{t.lista.ranking}</p>
        </section>
      </div>
    </DiscoverShell>
  );
}
