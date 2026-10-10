// Foto-hero för funktions- och branschsidorna (WP-75, Funktion.dc.html / Bransch.dc.html):
// helbildsfoto med varm toning, brödsmulor, rubrik med lime-markering och glaskort. Den
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
    <section className="-mt-26 p-4">
      <div className="relative flex flex-col overflow-hidden rounded-shell bg-dark text-on-dark lg:min-h-180">
        <Image
          src={`/marketing/${foto}.webp`}
          alt={fotoAlt}
          fill
          priority
          sizes="(min-width: 1440px) 1408px, 100vw"
          className={cn("object-cover", fotoPos)}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-hero-tint-mobile lg:bg-cta-tint"
        />

        <div className="relative flex flex-col gap-5 px-6 pt-32 pb-10 sm:px-10 lg:max-w-170 lg:px-16 lg:pt-40 lg:pb-24">
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

        {tarjeta ? (
          <div className="absolute right-18 bottom-18 hidden w-82.5 lg:block">
            {tarjeta}
          </div>
        ) : null}
      </div>
    </section>
  );
}
