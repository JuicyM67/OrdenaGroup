// "Blixttider idag" (WP-68, Main.dc.html): mörk remsa med dagens kommande
// blixttider hos företag som visar dem i Upptäck (på som standard, ägarens beslut
// 2026-10-10). Varje tid länkar till bokningssidan med tiden förvald (`?flash=`,
// samma djuplänk som i blixttidsutskicken) — priset räknas av servern där.
import { Zap } from "lucide-react";
import Link from "next/link";

import { descubre } from "@/i18n";
import { formatMoney } from "@/lib/format/money";
import type { FlashStripItem } from "@/server/marketplace/public";

import { formatClock, formatKm } from "./format";

const t = descubre;

export function FlashStrip({
  items,
  allHref,
}: {
  items: readonly FlashStripItem[];
  allHref: string;
}) {
  if (items.length === 0) return null;
  return (
    <section
      aria-label={t.flash.label}
      className="flex w-full min-w-0 flex-col gap-3.5 overflow-hidden rounded-hero bg-dark py-5 text-on-dark"
    >
      <div className="flex items-center justify-between gap-3 px-5">
        <h2 className="flex items-center gap-2.5 font-display text-22 font-semibold tracking-display">
          <Zap
            aria-hidden="true"
            className="size-5 fill-lime text-lime"
            strokeWidth={0}
          />
          {t.flash.titulo}
        </h2>
        <Link
          href={allHref}
          className="rounded-badge text-13 font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
        >
          {t.flash.verTodas}
        </Link>
      </div>
      <ul className="relative flex w-full min-w-0 snap-x gap-2.5 overflow-x-auto px-5 pb-1">
        {items.map((f) => (
          <li key={f.id} className="w-43 shrink-0 snap-start sm:w-52">
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
    </section>
  );
}
