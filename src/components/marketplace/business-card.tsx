// Företagskort i Descubre (WP-85, D-070), i samma formspråk som erbjudandekorten
// (vita kort, bild överst, lime-märken). Hela kortet länkar till företagets
// bokningssida. Utan egen bild (t.ex. en logga som ligger utanför vår lagring,
// B1/#111 S3) visas kategorins pastellton med ikon och initialer.
import { MapPin, Star, Tag, Zap } from "lucide-react";
import Link from "next/link";

import { cn } from "@/components/ui/cn";
import { descubre } from "@/i18n";
import { isOwnImageUrl } from "@/lib/media/storage-url";
import type { BusinessCard as BusinessCardData } from "@/server/marketplace/businesses";

import { CATEGORY_UI } from "./categories";
import { formatClock, formatKm, formatRating } from "./format";
import { OfferImage } from "./offer-image";

const t = descubre;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^[\p{L}\p{N}]/u.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function placeLine(b: BusinessCardData): string | null {
  if (b.servesAtCustomer) {
    return b.serviceAreas.length > 0
      ? t.negocioTarjeta.aDomicilioEn({ comunas: b.serviceAreas.join(", ") })
      : t.negocioTarjeta.aDomicilio;
  }
  if (b.distanceKm !== null) {
    const km = t.tarjeta.km({ km: formatKm(b.distanceKm) });
    return b.areaName ? `${b.areaName} · ${km}` : km;
  }
  return b.areaName;
}

export function BusinessCard({
  business: b,
  priority = false,
}: {
  business: BusinessCardData;
  priority?: boolean;
}) {
  const ui = CATEGORY_UI[b.category];
  const hasImage = b.imageUrl !== null && isOwnImageUrl(b.imageUrl);
  const place = placeLine(b);

  return (
    <Link
      href={`/${b.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-card bg-surface transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <div className={cn("relative aspect-16/10", hasImage ? "" : ui.tone)}>
        {hasImage ? (
          <OfferImage
            src={b.imageUrl}
            alt=""
            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
            priority={priority}
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center"
          >
            <span className="flex size-20 items-center justify-center rounded-full bg-surface/70 font-display text-30 font-semibold tracking-display text-ink">
              {initials(b.name) || (
                <ui.icon className="size-8" strokeWidth={2} />
              )}
            </span>
          </div>
        )}
        <span className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {b.flashToday !== null ? (
            <span className="flex items-center gap-1 rounded-chip bg-ink px-2.5 py-1 text-12 font-bold text-lime">
              <Zap
                aria-hidden="true"
                className="size-3.5 fill-lime"
                strokeWidth={0}
              />
              {t.tarjeta.flash({ hora: formatClock(b.flashToday) })}
            </span>
          ) : null}
          {b.offerCount > 0 ? (
            <span className="flex items-center gap-1 rounded-chip bg-lime px-2.5 py-1 text-12 font-bold text-ink">
              <Tag aria-hidden="true" className="size-3.5" strokeWidth={2} />
              {b.offerCount === 1
                ? t.negocioTarjeta.oferta
                : t.negocioTarjeta.ofertas({ n: b.offerCount })}
            </span>
          ) : null}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="flex items-center gap-1.5 text-12 font-semibold text-muted">
          <span
            aria-hidden="true"
            className={cn(
              "flex size-5 items-center justify-center rounded-full",
              ui.tone,
            )}
          >
            <ui.icon className="size-3" strokeWidth={2} />
          </span>
          {t.categorias.nombres[b.category]}
        </p>
        <h3 className="text-17 leading-snug font-bold text-ink group-hover:underline group-hover:underline-offset-4">
          {b.name}
        </h3>
        <p className="flex items-center gap-1 text-13 text-muted">
          {b.rating ? (
            <>
              <Star
                aria-hidden="true"
                className="size-3.5 fill-ink-soft text-ink-soft"
                strokeWidth={0}
              />
              <span className="sr-only">
                {t.tarjeta.nota({ nota: formatRating(b.rating.average) })}
              </span>
              <span aria-hidden="true" className="font-semibold text-ink-soft">
                {formatRating(b.rating.average)}
              </span>
              <span>{t.tarjeta.resenas({ n: b.rating.count })}</span>
            </>
          ) : (
            <span>{t.negocioTarjeta.nuevo}</span>
          )}
        </p>
        {place ? (
          <p className="mt-auto flex items-center gap-1.5 pt-1 text-13 text-ink-soft">
            <MapPin
              aria-hidden="true"
              className="size-3.5 shrink-0"
              strokeWidth={2}
            />
            <span className="truncate">{place}</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}
