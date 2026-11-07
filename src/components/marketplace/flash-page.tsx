// Descubre — blixttidsfliken (WP-85, D-070): alla dagens kommande blixttider hos
// företag som visar dem i Descubre, i tidsordning, i samma ram som övriga flikar.
// Varje tid länkar till bokningssidan med tiden förvald (`?flash=`, som remsan).
import { Zap } from "lucide-react";
import Link from "next/link";

import type { Migas } from "@/components/marketing/paginas/json-ld";
import { descubre } from "@/i18n";
import { formatMoney } from "@/lib/format/money";
import type { AreaOption, FlashStripItem } from "@/server/marketplace/public";

import type { ConsumerNav } from "./consumer-session";
import { DiscoverShell } from "./discover-shell";
import { formatClock, formatKm } from "./format";
import { GrowingNotice } from "./growing-notice";
import { discoverHref, flashHref, type DiscoverParams } from "./params";

const t = descubre;

export function FlashPage({
  items,
  areas,
  params,
  hasPosition,
  migas,
  nav,
}: {
  items: readonly FlashStripItem[];
  areas: readonly AreaOption[];
  params: DiscoverParams;
  hasPosition: boolean;
  migas: Migas;
  nav: ConsumerNav;
}) {
  const listBase = (p: DiscoverParams) => flashHref(p);
  return (
    <DiscoverShell
      tab="flash"
      migas={migas}
      heading={{ pre: "", marca: t.flashLista.titulo }}
      bajada={t.flashLista.bajada}
      searchAction={discoverHref({})}
      params={params}
      areas={areas}
      hasPosition={hasPosition}
      listBase={listBase}
      nav={nav}
    >
      <section
        aria-labelledby="descubre-flash"
        className="flex flex-col gap-4 rounded-hero bg-dark p-5 text-on-dark sm:p-7"
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            id="descubre-flash"
            className="flex items-center gap-2.5 font-display text-22 font-semibold tracking-display"
          >
            <Zap
              aria-hidden="true"
              className="size-5 fill-lime text-lime"
              strokeWidth={0}
            />
            {t.flash.titulo}
          </h2>
          <p className="text-13 font-semibold text-on-dark-muted">
            {t.flashLista.resultados({ n: items.length })}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-start gap-2 rounded-tile bg-dark-2 p-5">
            <h3 className="text-18 font-bold">{t.flashLista.vacioTitulo}</h3>
            <p className="text-14 text-on-dark-muted">
              {t.flashLista.vacioTexto}
            </p>
            <Link
              href={discoverHref(params.ort ? { ort: params.ort } : {})}
              className="mt-2 rounded-badge text-14 font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-lime"
            >
              {t.flashLista.verNegocios}
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {items.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/${f.businessSlug}?flash=${f.id}`}
                  className="flex h-full flex-col gap-1 rounded-tile bg-dark-2 p-3.5 transition-colors duration-150 ease-out hover:bg-dark-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                >
                  <span className="flex items-center justify-between gap-2">
                    <b className="font-display text-24 font-semibold tracking-display">
                      {formatClock(f.start)}
                    </b>
                    <span className="rounded-badge bg-lime px-2 py-0.5 text-12 font-bold text-ink">
                      −{f.discountPct} %
                    </span>
                  </span>
                  <span className="truncate text-14 font-bold">
                    {f.serviceName}
                  </span>
                  <span className="truncate text-12 text-on-dark-muted">
                    {f.businessName}
                    {f.distanceKm !== null
                      ? ` · ${formatKm(f.distanceKm)} km`
                      : f.areaName
                        ? ` · ${f.areaName}`
                        : ""}
                  </span>
                  <span className="mt-1 flex items-baseline gap-1.5 text-14">
                    <span className="sr-only">{t.flash.precioAntes}</span>
                    <s className="text-12 text-on-dark-muted">
                      {formatMoney(f.regularMinor)}
                    </s>
                    <b className="font-bold">{formatMoney(f.priceMinor)}</b>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <GrowingNotice />
    </DiscoverShell>
  );
}
