// Små byggstenar för funktions- och branschsidorna (WP-75): primär- och glasknapp i hero,
// glaskort över foto, FAQ och avslutande CTA ("Ska vi bli buddies?").
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";

import type { MockFila, Pregunta } from "@/i18n/paginas";

export function HeroPrimary({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <Button
      asChild
      variant="accent"
      size="2xl"
      className="h-14 rounded-full px-6"
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}

export function HeroGlass({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-14 items-center rounded-full px-5.5 font-bold text-on-dark glass-nav transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
    >
      {children}
    </Link>
  );
}

/** Glaskortet över hero-fotot: en rad, ett värde och en grön statuspill. */
export function HeroCard({
  linea,
  valor,
  estado,
}: {
  linea: string;
  valor: string;
  estado: string;
}) {
  return (
    <div
      className="flex flex-col gap-2.5 rounded-hero p-5 glass-light"
      aria-hidden="true"
    >
      <span className="text-12 text-muted">{linea}</span>
      <b className="font-display text-22">{valor}</b>
      <span className="flex h-11 items-center justify-center rounded-avatar bg-success-bg px-3 text-center text-14 font-bold text-success-fg">
        {estado}
      </span>
    </div>
  );
}

/** UI-mockupen ("Betalningar · Inställningar") i glas över ett suddigt foto. */
export function MockPanel({
  foto,
  titulo,
  filas,
  boton,
}: {
  foto: string;
  titulo: string;
  filas: readonly MockFila[];
  boton: string;
}) {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-96 items-center justify-center overflow-hidden rounded-shell bg-dark px-4 lg:h-115"
    >
      <Image
        src={`/marketing/${foto}.webp`}
        alt=""
        fill
        sizes="(min-width: 1024px) 600px, 100vw"
        className="scale-105 object-cover blur-photo brightness-80"
      />
      <div className="relative flex w-80 max-w-full flex-col gap-3 rounded-hero p-5.5 glass-light">
        <b className="text-16">{titulo}</b>
        {filas.map((f) => (
          <span key={f.k} className="flex justify-between gap-3 text-14">
            <span>{f.k}</span>
            <b className={cn(f.ok ? "text-success-fg" : "")}>{f.v}</b>
          </span>
        ))}
        <span className="flex h-11 items-center justify-center rounded-avatar bg-ink text-center font-bold text-on-dark">
          {boton}
        </span>
      </div>
    </div>
  );
}

export function PageFaq({
  etiqueta,
  titulo,
  items,
}: {
  etiqueta: string;
  titulo: string;
  items: readonly Pregunta[];
}) {
  return (
    <section className="bg-canvas">
      <div className="mx-auto grid max-w-360 grid-cols-1 gap-10 px-4 pb-16 sm:px-8 lg:grid-cols-12 lg:px-22 lg:pb-25">
        <div className="flex flex-col gap-3.5 lg:col-span-4">
          <span className="self-start rounded-chip bg-surface px-3 py-1.75 text-13 font-bold tracking-label">
            {etiqueta}
          </span>
          <h2 className="font-display text-40 leading-none font-semibold tracking-headline sm:text-44">
            {titulo}
          </h2>
        </div>
        <div className="lg:col-span-8">
          {items.map((item, k) => (
            <details
              key={item.pregunta}
              open={k === 0}
              className="group border-t border-line-strong px-1 py-4.5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 rounded-event text-16 font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink sm:text-17">
                {item.pregunta}
                <ChevronDown
                  aria-hidden="true"
                  className="size-5 shrink-0 transition-transform duration-300 group-open:rotate-180"
                  strokeWidth={2.5}
                />
              </summary>
              <p className="mt-2.5 max-w-190 text-15 leading-relaxed text-muted">
                {item.respuesta}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Avslutande CTA över foto: "Ska vi bli buddies?" + knapp. */
export function BuddyCta({
  foto = "hero",
  pre,
  marca,
  texto,
  boton,
  className,
}: {
  foto?: string;
  pre: string;
  marca: string;
  texto: string;
  boton: string;
  className?: string;
}) {
  return (
    <section
      className={cn("bg-canvas px-4 pb-16 lg:px-22 lg:pb-25", className)}
    >
      <div className="relative mx-auto flex max-w-360 flex-col justify-center overflow-hidden rounded-cta px-6 py-14 text-on-dark sm:px-10 lg:px-16 lg:py-20">
        <Image
          src={`/marketing/${foto}.webp`}
          alt=""
          fill
          sizes="(min-width: 1440px) 1360px, 100vw"
          className="object-cover object-top"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cta-tint-mobile lg:bg-cta-tint"
        />
        <div className="relative flex max-w-140 flex-col gap-4">
          <h2 className="font-display text-40 leading-none font-semibold tracking-headline sm:text-52">
            {pre}
            <br />
            <span className="rounded-highlight bg-lime box-decoration-clone px-2.5 text-ink">
              {marca}
            </span>
          </h2>
          <p className="text-16 text-on-dark/90 sm:text-17">{texto}</p>
          <div>
            <HeroPrimary href="/login">{boton}</HeroPrimary>
          </div>
        </div>
      </div>
    </section>
  );
}
