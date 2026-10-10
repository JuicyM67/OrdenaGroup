// Ort/position-väljaren (WP-68): en native `<details>`-meny (fungerar utan JS)
// med "Min position" (klientö) och orterna som har erbjudanden (`?ort=`).
import { ChevronDown, MapPin } from "lucide-react";
import Link from "next/link";

import { cn } from "@/components/ui/cn";
import { descubre } from "@/i18n";
import type { AreaOption } from "@/server/marketplace/public";

import type { DiscoverParams } from "./params";
import { PositionButton } from "./position-button";

const t = descubre;

export function LocationMenu({
  areas,
  params,
  hasPosition,
  basePath,
  className,
  tone = "light",
}: {
  areas: readonly AreaOption[];
  params: DiscoverParams;
  hasPosition: boolean;
  /** Sidan som orterna länkar till (lista eller karta, med kategori). */
  basePath: (p: DiscoverParams) => string;
  className?: string;
  tone?: "light" | "glass";
}) {
  const current = areas.find((a) => a.slug === params.ort);
  const label = current
    ? current.name
    : hasPosition
      ? t.ubicacion.cercaDeTi
      : t.ubicacion.todas;
  const keep: DiscoverParams = { ...params, sida: undefined };

  return (
    <details className={cn("group relative", className)}>
      <summary
        className={cn(
          "flex h-11 cursor-pointer list-none items-center gap-1.5 rounded-control px-3.5 text-13 font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          tone === "glass" ? "glass-light" : "bg-surface",
        )}
      >
        <MapPin aria-hidden="true" className="size-4" strokeWidth={2} />
        <span className="sr-only">{t.ubicacion.elegir}: </span>
        {label}
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 transition-transform duration-200 group-open:rotate-180"
          strokeWidth={2}
        />
      </summary>
      <div className="absolute top-full left-0 z-30 mt-2 flex w-72 flex-col gap-2 rounded-panel bg-surface p-2.5 text-ink shadow-popover">
        <PositionButton
          active={hasPosition}
          labels={{
            miPosicion: t.ubicacion.miPosicion,
            quitar: t.ubicacion.quitar,
            cargando: t.ubicacion.cargando,
            denegada: t.ubicacion.denegada,
            nota: t.ubicacion.nota,
          }}
        />
        <ul className="flex max-h-64 flex-col overflow-y-auto border-t border-line-strong pt-1.5">
          <li>
            <Link
              href={basePath({ ...keep, ort: undefined })}
              className={cn(
                "flex rounded-event px-3 py-2 text-14 hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-ink",
                params.ort === undefined ? "font-bold" : "",
              )}
            >
              {t.ubicacion.todas}
            </Link>
          </li>
          {areas.map((a) => (
            <li key={a.slug}>
              <Link
                href={basePath({ ...keep, ort: a.slug })}
                aria-current={a.slug === params.ort ? "true" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-event px-3 py-2 text-14 hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-ink",
                  a.slug === params.ort ? "font-bold" : "",
                )}
              >
                {a.name}
                <span className="text-12 text-muted">{a.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
