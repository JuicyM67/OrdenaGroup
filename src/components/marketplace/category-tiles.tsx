// Kategorirutorna (WP-68): pastellrutor med rund ikoncirkel; "Alla" är mörk med
// lime-ikon (Desktop.dc.html / Main.dc.html). Mobil: horisontell rad som scrollar.
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
}: {
  counts: readonly CategoryCount[];
  active: MarketplaceCategoryId | undefined;
  params: DiscoverParams;
}) {
  const countOf = (id: MarketplaceCategoryId): number =>
    counts.find((c) => c.category === id)?.count ?? 0;
  const total = counts.reduce((s, c) => s + c.count, 0);
  const keep: DiscoverParams = { ...params, sida: undefined };

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
      <ul className="relative flex gap-2 overflow-x-auto px-4 pb-1 sm:px-0 lg:grid lg:grid-cols-6 lg:gap-3.5 lg:overflow-visible">
        {tiles.map((tile) => {
          const isActive = tile.id === active;
          const dark = tile.id === undefined;
          return (
            <li key={tile.id ?? "todas"} className="shrink-0">
              <Link
                href={discoverHref(keep, tile.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-22 w-21 flex-col items-center justify-center gap-1.5 rounded-tile text-13 font-semibold transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink lg:h-32 lg:w-full lg:items-start lg:justify-between lg:rounded-card lg:p-4",
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
                  <span className="lg:text-16 lg:font-bold">{tile.label}</span>
                  <span
                    className={cn(
                      "hidden text-12 font-medium lg:block",
                      dark ? "text-on-dark-soft" : "text-ink-soft",
                    )}
                  >
                    {dark ? t.categorias.total({ n: tile.count }) : tile.count}
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
