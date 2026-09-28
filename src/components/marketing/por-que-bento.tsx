// "Por qué funciona": bento 4×2 (WP-hemsida, mappad från `.visual-diff/ref/sida-v1-bento.html`,
// första sektionen). Ersätter usp-showcase.tsx och bento-grid.tsx (borttagna, se
// PR-rapporten). Fem rutor: reservas (lime, länk som skrivs ut), local (foto, row-span-2,
// svävande chip), agenda (lavender, växande staplar), inasistencias (peach, toggle) och
// precio (mörk, rullande siffra). Mobil: staplas i en enkel 2-kolumnsgrid utan fasta
// radhöjder; `lg:` återskapar den exakta 4×2-bentot med `lg:h-120` (två 240px-rader minus
// mellanrum, samma mönster som referensens `grid-template-rows:repeat(2,240px)`).
import Image from "next/image";

import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { copy } from "@/i18n/marketing";

import { DEMO } from "./demo-data";

const P = copy.sitio.inicio.porQue;

function LinkChip() {
  return (
    <div
      aria-hidden="true"
      className="flex w-fit shrink-0 items-center gap-1.5 rounded-tile bg-surface py-1.5 pr-3 pl-2.5 text-13 font-semibold text-ink"
    >
      <span className="relative inline-flex w-36 items-center overflow-hidden text-13 font-semibold whitespace-nowrap text-ink">
        <span className="animate-hero-type overflow-hidden whitespace-nowrap">
          {DEMO.lank}
        </span>
        <span
          aria-hidden="true"
          className="ml-0.5 h-3.5 w-0.5 shrink-0 animate-hero-caret bg-ink"
        />
      </span>
    </div>
  );
}

function ReservasTile() {
  return (
    <Card
      tone="lime"
      radius="tile"
      padding="xl"
      className="col-span-2 flex min-h-64 flex-col justify-between gap-6 lg:col-span-2 lg:row-start-1"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="max-w-70 text-22 leading-snug font-bold text-ink sm:text-24">
          {P.tarjetas.reservas.titulo}
        </h3>
        <LinkChip />
      </div>
      <p className="max-w-sm text-15 text-on-lime-soft">
        {P.tarjetas.reservas.texto}
      </p>
    </Card>
  );
}

function LocalTile() {
  return (
    <div className="relative col-span-2 min-h-64 overflow-hidden rounded-tile lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:min-h-0">
      <Image
        src="/images/sitio/bento-salon.webp"
        alt=""
        fill
        sizes="(min-width: 1024px) 25vw, 100vw"
        className="object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/15 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute top-4 right-4 max-w-40 animate-float rounded-tile bg-surface px-3.5 py-2.5 text-13 font-bold text-ink shadow-popover"
      >
        {P.tarjetas.local.chip({ n: 38 })}
      </div>
      <div className="absolute inset-x-4 bottom-4 flex flex-col gap-1.5">
        <h3 className="text-22 leading-snug font-bold text-on-dark">
          {P.tarjetas.local.titulo}
        </h3>
        <p className="text-13 text-on-dark-soft">{P.tarjetas.local.texto}</p>
      </div>
    </div>
  );
}

const BARS: readonly {
  height: number;
  delay: boolean;
  active?: boolean;
}[] = [
  { height: 40, delay: false },
  { height: 62, delay: true },
  { height: 52, delay: false },
  { height: 70, delay: true, active: true },
  { height: 58, delay: false },
];

function AgendaTile() {
  return (
    <Card
      tone="surface"
      radius="tile"
      padding="lg"
      className="col-span-2 flex flex-col justify-between gap-4 bg-lavender lg:col-span-1 lg:col-start-4 lg:row-start-1"
    >
      <h3 className="text-19 leading-snug font-bold text-ink">
        {P.tarjetas.agenda.titulo}
      </h3>
      <div aria-hidden="true" className="flex h-17.5 items-end gap-1.5">
        {BARS.map((bar, i) => (
          <span
            key={i}
            style={{ height: bar.height }}
            className={cn(
              "w-full origin-bottom rounded-badge",
              bar.delay ? "animate-grow-bar-delay" : "animate-grow-bar",
              bar.active ? "bg-violet" : "bg-lilac",
            )}
          />
        ))}
      </div>
    </Card>
  );
}

function InasistenciasTile() {
  return (
    <Card
      tone="peach"
      radius="tile"
      padding="lg"
      className="col-span-2 flex flex-col justify-between gap-5 lg:col-span-1 lg:col-start-1 lg:row-start-2"
    >
      <h3 className="text-19 leading-snug font-bold text-ink">
        {P.tarjetas.inasistencias.titulo}
      </h3>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 truncate">
          <div className="text-14 font-bold text-ink">{DEMO.kund}</div>
          <div className="text-12 text-on-peach-soft">
            15:00 · {P.tarjetas.inasistencias.pregunta}
          </div>
        </div>
        <span
          aria-hidden="true"
          className="relative h-10.5 w-22.5 shrink-0 rounded-full bg-ink"
        >
          <span className="absolute top-1 left-1 size-8.5 animate-toggle-knob rounded-full bg-surface" />
        </span>
      </div>
    </Card>
  );
}

function PrecioTile() {
  return (
    <Card
      tone="dark"
      radius="tile"
      padding="lg"
      className="col-span-2 flex flex-col justify-between gap-5 lg:col-span-1 lg:col-start-2 lg:row-start-2"
    >
      <h3 className="text-19 leading-snug font-bold text-on-dark">
        {P.tarjetas.precio.titulo}
      </h3>
      <div className="flex items-baseline gap-2.5">
        <div className="h-11 overflow-hidden">
          <div className="flex animate-count-roll flex-col font-display text-38 leading-11 font-bold text-lime">
            <span>1</span>
            <span>4</span>
            <span>9</span>
          </div>
        </div>
        <span className="text-12 text-on-dark-muted">
          {P.tarjetas.precio.pie}
        </span>
      </div>
    </Card>
  );
}

export function PorQueBento() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-4">
          <span className="w-fit rounded-full border border-border bg-surface px-3.5 py-1.5 text-12 font-bold tracking-caps text-ink uppercase">
            {P.etiqueta}
          </span>
          <h2 className="max-w-2xl font-display text-32 leading-hero font-bold tracking-display text-ink sm:text-40">
            {P.titulo}{" "}
            <span className="rounded-event bg-lime px-2.5">
              {P.tituloDestacado}
            </span>
          </h2>
        </div>
        <p className="max-w-sm text-15 leading-relaxed text-muted">{P.texto}</p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:h-120 lg:grid-cols-4 lg:grid-rows-2">
        <ReservasTile />
        <LocalTile />
        <AgendaTile />
        <InasistenciasTile />
        <PrecioTile />
      </div>
    </section>
  );
}
