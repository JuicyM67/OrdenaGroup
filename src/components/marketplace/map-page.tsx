// Upptäck — kartvyn (WP-68, Karta.dc.html): karta över hela ytan med sökfält och
// kategorichips ovanpå, och samma urval som listan i ett bottenark (mobil) eller en
// sidopanel (dator). Kartan själv är en klientö som laddar MapLibre först här.
import { Zap } from "lucide-react";
import Link from "next/link";

import { SiteHeader } from "@/components/marketing/site-header";
import { cn } from "@/components/ui/cn";
import { market } from "@/config/brand";
import {
  categorySlug,
  MARKETPLACE_CATEGORY_IDS,
  type MarketplaceCategoryId,
} from "@/config/marketplace";
import { descubre } from "@/i18n";
import type {
  AreaOption,
  OfferCard as OfferCardData,
} from "@/server/marketplace/public";

import { BottomTabs } from "./bottom-tabs";
import type { ConsumerNav } from "./consumer-session";
import { formatClock } from "./format";
import { MapView, type MapPoint } from "./map-view";
import { OfferCard } from "./offer-card";
import { discoverHref, type DiscoverParams } from "./params";
import { SearchForm } from "./search-form";
import { ViewToggle } from "./view-toggle";

const t = descubre;

/** Stadens mitt när varken position eller träffar finns. */
// Utan position och utan träffar: installationens huvudstad (Stockholm /
// Santiago centrum).
const FALLBACK_CENTER =
  market === "SE"
    ? { lat: 59.3293, lng: 18.0686 }
    : { lat: -33.4372, lng: -70.6506 };

const chip =
  "flex h-10 shrink-0 items-center gap-1.5 rounded-control px-4 text-13 font-bold shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function MapPage({
  offers,
  withoutCoords,
  params,
  category,
  position,
  area,
  nav,
}: {
  offers: readonly OfferCardData[];
  withoutCoords: number;
  params: DiscoverParams;
  category: MarketplaceCategoryId | undefined;
  position: { lat: number; lng: number } | undefined;
  area: AreaOption | undefined;
  nav: ConsumerNav;
}) {
  // En markör per salong (flera erbjudanden på samma adress hamnar annars
  // ovanpå varandra): listans första träff (närmast/bäst) får representera den.
  const perBusiness = offers.filter(
    (o, i) =>
      offers.findIndex((x) => x.business.slug === o.business.slug) === i,
  );
  const points: MapPoint[] = perBusiness.map((o) => ({
    id: o.id,
    lat: o.business.lat!,
    lng: o.business.lng!,
    label:
      o.flashToday !== null
        ? formatClock(o.flashToday)
        : t.tarjeta.descuento({ pct: o.discountPct }),
    flash: o.flashToday !== null,
    title: o.title,
  }));
  const center =
    position ??
    (points[0] ? { lat: points[0].lat, lng: points[0].lng } : FALLBACK_CENTER);
  const mapHref = (p: DiscoverParams, c?: MarketplaceCategoryId) =>
    discoverHref(p, c, "karta");
  const keep: DiscoverParams = { ...params, sida: undefined };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas">
      <SiteHeader className="mt-4 shrink-0" />
      <main className="relative mt-4 flex min-h-0 flex-1 flex-col lg:flex-row-reverse">
        <h1 className="sr-only">{t.meta.mapa}</h1>
        <div className="relative min-h-0 flex-1">
          <MapView
            points={points}
            center={center}
            me={position ?? null}
            labels={{
              cargando: t.mapa.cargando,
              error: t.mapa.error,
              tuPosicion: t.mapa.tuPosicion,
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2.5 p-4">
            <SearchForm
              action={mapHref({})}
              params={params}
              placeholder={
                area ? t.mapa.buscarEn({ zona: area.name }) : t.mapa.buscarCerca
              }
              className="pointer-events-auto max-w-xl"
              extraHidden={
                category ? { kategori: categorySlug(category) } : undefined
              }
            />
            <nav
              aria-label={t.categorias.label}
              className="pointer-events-auto -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
            >
              <Link
                href={mapHref(keep)}
                aria-current={category === undefined ? "page" : undefined}
                className={cn(
                  chip,
                  category === undefined ? "bg-ink text-on-dark" : "bg-surface",
                )}
              >
                {t.categorias.todas}
              </Link>
              {MARKETPLACE_CATEGORY_IDS.map((id) => (
                <Link
                  key={id}
                  href={mapHref(keep, id)}
                  aria-current={category === id ? "page" : undefined}
                  className={cn(
                    chip,
                    category === id ? "bg-ink text-on-dark" : "bg-surface",
                  )}
                >
                  {t.categorias.nombres[id]}
                </Link>
              ))}
              <Link
                href={mapHref(
                  { ...keep, blixt: params.blixt ? undefined : true },
                  category,
                )}
                aria-current={params.blixt ? "page" : undefined}
                className={cn(
                  chip,
                  params.blixt ? "bg-ink text-lime" : "bg-lime text-ink",
                )}
              >
                <Zap aria-hidden="true" className="size-4" strokeWidth={2} />
                {t.mapa.hoy}
              </Link>
            </nav>
          </div>
        </div>

        <section
          aria-labelledby="karta-lista"
          className="relative z-10 -mt-6 flex max-h-96 shrink-0 flex-col gap-3 rounded-t-shell bg-canvas px-4 pt-3 pb-28 lg:mt-0 lg:max-h-none lg:w-105 lg:rounded-none lg:px-6 lg:pt-2 lg:pb-6"
        >
          <span
            aria-hidden="true"
            className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-border lg:hidden"
          />
          <div className="flex items-center justify-between gap-3">
            <h2
              id="karta-lista"
              className="font-display text-22 font-semibold tracking-display"
            >
              {t.mapa.aqui({ n: offers.length })}
            </h2>
            <Link
              href={discoverHref(params, category)}
              className="rounded-badge text-13 font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ink lg:hidden"
            >
              {t.mapa.verLista}
            </Link>
            <ViewToggle
              active="karta"
              listHref={discoverHref(params, category)}
              mapHref={mapHref(params, category)}
              className="hidden lg:flex"
            />
          </div>
          <ul className="flex min-h-0 flex-col gap-2.5 overflow-y-auto pb-2">
            {offers.map((o) => (
              <li key={o.id}>
                <OfferCard offer={o} variant="compact" id={`karta-${o.id}`} />
              </li>
            ))}
          </ul>
          {withoutCoords > 0 ? (
            <p className="text-12 text-muted">
              {t.mapa.sinUbicacion({ n: withoutCoords })}
            </p>
          ) : null}
        </section>
      </main>
      <BottomTabs active="mapa" nav={nav} />
    </div>
  );
}
