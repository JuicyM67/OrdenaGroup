// Kategorirutorna (WP-68): pastellrutor med rund ikoncirkel; "Alla" är mörk med
// lime-ikon (Desktop.dc.html / Main.dc.html). Mobil: horisontell rad som scrollar.
// WP-85: 16 kategorier (två rader om åtta på dator), länken per flik via `hrefFor`
// och antalet som företag eller erbjudanden via `unit`.
import Link from "next/link";

import { cn } from "@/components/ui/cn";
import {
  MARKETPLACE_CATEGORY_IDS,
  type MarketplaceCategoryId,
} from "@/config/marketplace";
import { descubre } from "@/i18n";
import type { CategoryCount } from "@/server/marketplace/public";

import { ALL_ICON, CATEGORY_UI } from "./categories";
import { discoverHref, type DiscoverParams } from "./params";

const t = descubre;

export function CategoryTiles({
  counts,
  active,
  params,
  hrefFor,
  unit = "ofertas",
  total: totalOverride,
}: {
  counts: readonly CategoryCount[];
  active: MarketplaceCategoryId | undefined;
  params: DiscoverParams;
  /** Länk för en ruta (standard: erbjudandelistan per kategori, WP-68). */
  hrefFor?: (
    id: MarketplaceCategoryId | undefined,
    keep: DiscoverParams,
  ) => string;
  unit?: "ofertas" | "negocios";
  /** Antalet på "Alla" när ett företag kan ligga i flera kategorier (WP-85). */
  total?: number;
}) {
  const countOf = (id: MarketplaceCategoryId): number =>
    counts.find((c) => c.category === id)?.count ?? 0;
  const total = totalOverride ?? counts.reduce((s, c) => s + c.count, 0);
  const keep: DiscoverParams = { ...params, sida: undefined };
  const link = hrefFor ?? ((id, p) => discoverHref(p, id));
  const totalText =
    unit === "negocios" ? t.categorias.totalNegocios : t.categorias.total;

  const tiles = [
    {
      id: undefined,
      label: t.categorias.todas,
      count: total,
      icon: ALL_ICON,
      tone: "",
    },
    ...MARKETPLACE_CATEGORY_IDS.map((id) => ({
      id,
      label: t.categorias.nombres[id],
      count: countOf(id),
      icon: CATEGORY_UI[id].icon,
      tone: CATEGORY_UI[id].tone,
    })),
  ];

  return (
    <nav aria-label={t.categorias.label} className="-mx-4 sm:mx-0">
      <ul className="relative flex gap-2 overflow-x-auto px-4 pb-1 sm:px-0 lg:grid lg:grid-cols-8 lg:gap-3 lg:overflow-visible">
        {tiles.map((tile) => {
          const isActive = tile.id === active;
          const dark = tile.id === undefined;
          return (
            <li key={tile.id ?? "todas"} className="shrink-0">
              <Link
                href={link(tile.id, keep)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-22 w-24 flex-col items-center justify-center gap-1.5 rounded-tile px-1 text-center text-13 leading-snug font-semibold transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink lg:h-30 lg:w-full lg:items-start lg:justify-between lg:rounded-card lg:p-3.5 lg:text-left",
                  dark ? "bg-ink text-on-dark" : `${tile.tone} text-ink`,
                  isActive && !dark
                    ? "ring-2 ring-ink ring-offset-2 ring-offset-canvas"
                    : "",
                  !isActive && dark && active !== undefined ? "bg-ink/85" : "",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full lg:size-11",
                    dark ? "bg-dark-2 text-lime" : "bg-surface/70",
                  )}
                >
                  <tile.icon className="size-4.5" strokeWidth={2} />
                </span>
                <span className="flex flex-col items-center lg:items-start">
                  <span className="lg:text-14 lg:font-bold">{tile.label}</span>
                  <span
                    className={cn(
                      "hidden text-12 font-medium lg:block",
                      dark ? "text-on-dark-soft" : "text-ink-soft",
                    )}
                  >
                    {dark ? totalText({ n: tile.count }) : tile.count}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
