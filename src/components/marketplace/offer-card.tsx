// Erbjudandekort i Upptäck (WP-68, Main.dc.html / Desktop.dc.html). Tre former:
// `grid` (bild överst, desktop och mobilens första kort), `row` (liten bild till
// vänster, mobilens lista) och `compact` (kartans bottenark). Hela kortet är en
// länk till erbjudandesidan; inga köpknappar förrän WP-69 (D-035).
import { Star } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import { hrefMarketplace } from "@/config/routes";
import { descubre } from "@/i18n";
import { formatMoney } from "@/lib/format/money";
import type { OfferCard as OfferCardData } from "@/server/marketplace/public";

import { formatClock, formatKm, formatRating } from "./format";
import { OfferImage } from "./offer-image";

const t = descubre;

function Badge({ offer }: { offer: OfferCardData }) {
  if (offer.flashToday !== null) {
    return (
      <span className="rounded-chip bg-ink px-2.5 py-1 text-12 font-bold text-lime">
        {t.tarjeta.flash({ hora: formatClock(offer.flashToday) })}
      </span>
    );
  }
  if (offer.discountPct <= 0) return null;
  return (
    <span className="rounded-chip bg-lime px-2.5 py-1 text-12 font-bold text-ink">
      {t.tarjeta.descuento({ pct: offer.discountPct })}
    </span>
  );
}

export function MetaLine({
  offer,
  className,
}: {
  offer: OfferCardData;
  className?: string;
}) {
  const parts = [
    offer.business.name,
    offer.distanceKm !== null
      ? t.tarjeta.km({ km: formatKm(offer.distanceKm) })
      : offer.business.areaName,
  ].filter(Boolean);
  return (
    <p className={cn("flex items-center gap-1 text-12 text-muted", className)}>
      {offer.rating ? (
        <>
          <Star
            aria-hidden="true"
            className="size-3.5 fill-ink-soft text-ink-soft"
            strokeWidth={0}
          />
          <span className="sr-only">
            {t.tarjeta.nota({ nota: formatRating(offer.rating.average) })}
          </span>
          <span aria-hidden="true" className="font-semibold text-ink-soft">
            {formatRating(offer.rating.average)}
          </span>
          <span>{t.tarjeta.resenas({ n: offer.rating.count })}</span>
          <span aria-hidden="true">·</span>
        </>
      ) : null}
      <span className="truncate">{parts.join(" · ")}</span>
    </p>
  );
}

export function PriceLine({
  offer,
  size = "md",
}: {
  offer: OfferCardData;
  size?: "md" | "lg";
}) {
  return (
    <p className="flex items-baseline gap-1.5">
      <span className="sr-only">{t.tarjeta.precioAntes}</span>
      <s className="text-13 text-muted">{formatMoney(offer.regularMinor)}</s>
      <span className="sr-only">{t.tarjeta.precioOferta}</span>
      <b className={size === "lg" ? "text-22 font-bold" : "text-19 font-bold"}>
        {formatMoney(offer.priceMinor)}
      </b>
    </p>
  );
}

const linkFocus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function OfferCard({
  offer,
  variant = "grid",
  priority = false,
  id,
  favorite,
}: {
  offer: OfferCardData;
  variant?: "grid" | "hero" | "row" | "compact";
  priority?: boolean;
  id?: string;
  /** Favorit-hjärtat (WP-67) — ligger utanför länken (inga formulär i en länk). */
  favorite?: ReactNode;
}) {
  const href = hrefMarketplace("oferta", offer.slug);
  const alt = offer.business.name;

  if (variant === "row" || variant === "compact") {
    return (
      <Link
        id={id}
        href={href}
        className={cn(
          "flex gap-3.5 rounded-card bg-surface p-2.5 transition-shadow duration-150 ease-out hover:shadow-soft",
          variant === "compact"
            ? "border-2 border-surface focus-visible:border-ink focus-visible:outline-none"
            : linkFocus,
        )}
      >
        <div className="relative size-24 shrink-0 overflow-hidden rounded-tile">
          <OfferImage src={offer.imageUrl} alt={alt} sizes="96px" />
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-1">
          {variant === "row" ? (
            <span className="w-fit rounded-chip bg-lavender px-2 py-0.5 text-12 font-bold text-on-lilac-soft">
              {offer.flashToday !== null
                ? t.tarjeta.flash({ hora: formatClock(offer.flashToday) })
                : `${t.categorias.nombres[offer.category]} · ${t.tarjeta.descuento({ pct: offer.discountPct })}`}
            </span>
          ) : null}
          <h3 className="truncate text-16 leading-snug font-bold">
            {offer.title}
          </h3>
          <MetaLine offer={offer} />
          <p className="flex items-baseline gap-1.5 text-14">
            <s className="text-muted">{formatMoney(offer.regularMinor)}</s>
            <b className="font-bold">{formatMoney(offer.priceMinor)}</b>
          </p>
        </div>
      </Link>
    );
  }

  return (
    <div className="relative h-full">
      <Link
        id={id}
        href={href}
        className={cn(
          "group flex h-full flex-col overflow-hidden rounded-card bg-surface transition-shadow duration-150 ease-out hover:shadow-soft",
          linkFocus,
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden",
            variant === "hero" ? "h-48" : "h-44",
          )}
        >
          <OfferImage
            src={offer.imageUrl}
            alt={alt}
            sizes="(min-width: 1024px) 320px, 100vw"
            priority={priority}
            className="transition-transform duration-300 ease-out group-hover:scale-102"
          />
          <div className="absolute top-3 left-3">
            <Badge offer={offer} />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <h3 className="text-16 leading-snug font-bold">{offer.title}</h3>
          <MetaLine offer={offer} />
          <div className="mt-auto flex items-end justify-between gap-3 pt-2">
            <PriceLine offer={offer} />
            {variant === "hero" ? (
              <span className="flex h-11 items-center rounded-control bg-ink px-4.5 text-14 font-bold text-on-dark">
                {t.lista.ver}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
      {favorite ? (
        <div className="absolute top-3 right-3">{favorite}</div>
      ) : null}
    </div>
  );
}
