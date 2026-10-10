// Foto-hero för funktions- och branschsidorna (WP-75, Funktion.dc.html / Bransch.dc.html):
// full-bleed helbildsfoto (kant i kant) med varm toning, brödsmulor, rubrik med lime-markering och glaskort. Den
// delade headern (`SiteHeader`) ligger ovanpå fotot (se sidornas `className="mt-10"`).
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

import type { Migas } from "./json-ld";

export function Brodsmulor({
  migas,
  label,
  className,
}: {
  migas: Migas;
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-wrap gap-x-2 gap-y-1 text-13 text-on-dark/80">
        {migas.map((m, i) => {
          const last = i === migas.length - 1;
          return (
            <li key={m.href} className="flex items-center gap-2">
              {last ? (
                <span
                  aria-current="page"
                  className="font-semibold text-on-dark"
                >
                  {m.nombre}
                </span>
              ) : (
                <>
                  <Link
                    href={m.href}
                    className="rounded-badge hover:text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                  >
                    {m.nombre}
                  </Link>
                  <span aria-hidden="true">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function FotoHero({
  foto,
  fotoPos = "object-center",
  fotoAlt,
  migas,
  migasLabel,
  etiqueta,
  pre,
  marca,
  texto,
  acciones,
  tarjeta,
}: {
  foto: string;
  fotoPos?: string;
  fotoAlt: string;
  migas: Migas;
  migasLabel: string;
  etiqueta?: string;
  pre: string;
  marca: string;
  texto: string;
  acciones: ReactNode;
  /** Glaskort: absolut till höger på desktop, under texten på mobil. */
  tarjeta?: ReactNode;
}) {
  return (
    <section className="relative -mt-26 flex flex-col overflow-hidden bg-dark text-on-dark lg:min-h-180">
      <Image
        src={`/marketing/${foto}.webp`}
        alt={fotoAlt}
        fill
        priority
        sizes="100vw"
        className={cn("object-cover", fotoPos)}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-photo-tint-mobile lg:bg-photo-tint"
      />

      <div className="relative mx-auto flex w-full max-w-360 flex-1 flex-col px-4 pt-32 pb-10 sm:px-8 lg:px-22 lg:pt-40 lg:pb-24">
        <div className="flex flex-col gap-5 lg:max-w-170">
          <Brodsmulor migas={migas} label={migasLabel} />
          {etiqueta ? (
            <span className="w-fit rounded-event px-3 py-1.75 text-13 font-bold glass-nav">
              {etiqueta}
            </span>
          ) : null}
          <h1 className="font-display text-40 leading-display font-semibold tracking-hero text-balance sm:text-56 lg:text-68">
            {pre}
            <br />
            <span className="rounded-highlight bg-lime box-decoration-clone px-2.5 text-ink">
              {marca}
            </span>
          </h1>
          <p className="max-w-xl text-16 leading-relaxed text-on-dark/90 sm:text-19">
            {texto}
          </p>
          <div className="flex flex-wrap gap-2.5">{acciones}</div>
          {tarjeta ? <div className="mt-2 lg:hidden">{tarjeta}</div> : null}
        </div>
      </div>

      {tarjeta ? (
        <div className="pointer-events-none absolute inset-0 mx-auto hidden max-w-360 lg:block">
          <div className="pointer-events-auto absolute right-22 bottom-18 w-82.5">
            {tarjeta}
          </div>
        </div>
      ) : null}
    </section>
  );
}
