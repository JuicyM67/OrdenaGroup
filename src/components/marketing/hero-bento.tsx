// Ny hero (WP-hemsida v2, retro 2026-09-28, punkt 2): ersätter det gamla lime-kortet +
// HeroVisualPreview + det mörka sifferbandet. Mappad från `.visual-diff/ref/hero-mix-ac.html`
// (hex → tokens, se filhuvudet där) — centrerad pill + H1 + undertext + två knappar, och under
// det ett bentogrid (foto, veckokalender, länkruta, 24/7 + Comisión). Bentogridet är en ren
// dekoration av produkten (samma mönster som den gamla `hero-visual-preview.tsx`: `role="img"`
// på ytterlagret, `aria-hidden` på varje inre lager) — rubrik/undertext/knappar bär den
// faktiska informationen. Text via `copy` (`@/i18n/marketing`, D-025/D-026), exempeldata via
// `DEMO` (`demo-data.ts`).
import {
  Check,
  Instagram,
  MessageCircle,
  QrCode,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { staffBgClass } from "@/components/agenda/agenda-view";
import type { StaffColor } from "@/components/agenda/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { brand } from "@/config/brand";
import { copy } from "@/i18n/marketing";

import { DEMO } from "./demo-data";

const BENTO = copy.sitio.inicio.heroBento;

/** Delar en tagline i "resten" + sista ordet, för lime-markeringen i H1 (ingen egen text —
 * `brand.tagline` kommer redan klar, regel dura 10). Rent mekaniskt (senaste blankstegen),
 * ingen språklogik. */
function splitLastWord(text: string): [rest: string, last: string] {
  const trimmed = text.trimEnd();
  const i = trimmed.lastIndexOf(" ");
  if (i === -1) return ["", trimmed];
  return [trimmed.slice(0, i + 1), trimmed.slice(i + 1)];
}

const SHARE_ICONS: readonly { icon: LucideIcon; tone: "dark" | "light" }[] = [
  { icon: Instagram, tone: "dark" },
  { icon: MessageCircle, tone: "light" },
  { icon: QrCode, tone: "light" },
];

const SHARE_DELAY = ["", "delay-100", "delay-200"] as const;

type HeroEvent = {
  title: string;
  time: string;
  top: number;
  height: number;
  tone: StaffColor | "flash" | "dark";
};

type HeroColumn = {
  dia: string;
  accent?: boolean;
  events: readonly HeroEvent[];
};

/** Cinco días de la maqueta ("Tu semana" siempre muestra Lun–Vie, sin fecha real, ver
 * `heroBento.semana` en es-CL.ts). Varios rubros (mismo criterio que `hero-visual-preview`
 * antes de este WP), para que el recorte se vea lleno. */
function buildColumns(): readonly HeroColumn[] {
  const [s0 = "", s1 = "", s2 = "", s3 = "", s4 = ""] = DEMO.tjanster;
  const s = [s0, s1, s2, s3, s4] as const;
  return [
    {
      dia: BENTO.semana.dias.lun,
      events: [
        { title: s[0], time: "10:00", top: 4, height: 22, tone: 1 },
        { title: s[2], time: "13:30", top: 66, height: 20, tone: 2 },
      ],
    },
    {
      dia: BENTO.semana.dias.mar,
      events: [
        { title: s[3], time: "11:00", top: 12, height: 32, tone: 5 },
        { title: s[4], time: "15:15", top: 56, height: 22, tone: 1 },
      ],
    },
    {
      dia: BENTO.semana.dias.mie,
      accent: true,
      events: [
        {
          title: "Flash",
          time: "12:15",
          top: 2,
          height: 28,
          tone: "flash",
        },
        {
          title: BENTO.toast({ dia: BENTO.semana.dias.mie, hora: "13:00" }),
          time: "13:00",
          top: 58,
          height: 28,
          tone: "dark",
        },
      ],
    },
    {
      dia: BENTO.semana.dias.jue,
      events: [
        { title: s[0], time: "09:30", top: 8, height: 24, tone: 2 },
        { title: s[3], time: "14:00", top: 40, height: 34, tone: 5 },
      ],
    },
    {
      dia: BENTO.semana.dias.vie,
      events: [
        { title: s[4], time: "10:30", top: 4, height: 26, tone: 1 },
        { title: s[2], time: "15:00", top: 44, height: 22, tone: 4 },
      ],
    },
  ];
}

function eventToneClass(tone: HeroEvent["tone"]): string {
  if (tone === "flash") {
    return "border-2 border-dashed border-flash-dot bg-lime text-ink";
  }
  if (tone === "dark") {
    return "bg-dark text-on-dark";
  }
  return cn(staffBgClass(tone), "text-ink");
}

function CalendarEvent({ event }: { event: HeroEvent }) {
  return (
    <div
      style={{ top: `${event.top}%`, height: `${event.height}%` }}
      className={cn(
        "absolute inset-x-0 flex flex-col overflow-hidden rounded-event p-1.5",
        eventToneClass(event.tone),
      )}
    >
      {event.tone === "flash" ? (
        <Chip size="tag" tone="ink" className="mb-0.5 w-fit self-start">
          {copy.estados.flashConDescuento({ porcentaje: 20 })}
        </Chip>
      ) : null}
      <span className="truncate text-event-title leading-event font-bold">
        {event.title}
      </span>
      <span
        className={cn(
          "truncate text-event-meta",
          event.tone === "dark" ? "text-on-dark-muted" : "text-ink-soft",
        )}
      >
        {event.time}
      </span>
    </div>
  );
}

function PhotoTile() {
  return (
    <div className="relative order-2 col-span-1 min-h-56 overflow-hidden rounded-hero lg:order-1 lg:row-span-2 lg:min-h-0">
      <Image
        src="/images/sitio/hero-salong.webp"
        alt=""
        fill
        sizes="(min-width: 1024px) 22vw, 50vw"
        className="object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-3 bottom-3 animate-float rounded-hero bg-dark p-4 text-on-dark"
      >
        <div className="text-11 text-on-dark-muted">
          {copy.hoy.siguiente({ relativo: copy.hoy.relativo.enMin({ n: 20 }) })}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-30 leading-none font-semibold tracking-display">
            15:00
          </span>
          <Chip size="xs" weight="bold" tone="success" className="shrink-0">
            {copy.estados.confirmada}
          </Chip>
        </div>
        <div className="truncate text-14 font-bold">{DEMO.kund}</div>
      </div>
    </div>
  );
}

function CalendarTile() {
  const columns = buildColumns();
  return (
    <Card
      tone="surface"
      radius="hero"
      padding="none"
      className="relative order-1 col-span-2 flex min-h-108 flex-col gap-2.5 overflow-hidden p-5 lg:order-2 lg:row-span-2 lg:min-h-0"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-13 font-bold text-muted">
          {BENTO.semana.titulo}
        </span>
        <div className="flex gap-1.5 text-11 font-bold">
          <span className="rounded-full bg-canvas px-2.5 py-1 text-ink">
            {BENTO.semana.vistaSemana}
          </span>
          <span className="rounded-full bg-ink px-2.5 py-1 text-on-dark">
            {BENTO.semana.vistaDia}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2 text-11 font-bold text-muted">
        {columns.map((column) => (
          <span
            key={column.dia}
            className={column.accent ? "text-violet" : undefined}
          >
            {column.dia}
          </span>
        ))}
      </div>
      <div className="relative grid flex-1 grid-cols-5 gap-2">
        {columns.map((column) => (
          <div key={column.dia} className="relative">
            {column.events.map((event) => (
              <CalendarEvent key={event.title + event.time} event={event} />
            ))}
          </div>
        ))}
        <div
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-0 w-0.5 animate-hero-now-line bg-violet"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute top-4 right-4 flex animate-hero-toast items-center gap-2 rounded-full bg-surface py-2 pr-3.5 pl-2 text-12 font-bold text-ink shadow-popover"
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-success-bg">
          <Check
            aria-hidden="true"
            className="size-3 text-success-fg"
            strokeWidth={3}
          />
        </span>
        {BENTO.toast({ dia: BENTO.semana.dias.mie, hora: "13:00" })}
      </div>
    </Card>
  );
}

function LinkTile() {
  return (
    <Card
      tone="lime"
      radius="hero"
      padding="none"
      className="order-3 flex flex-col justify-between gap-3.5 p-4.5 lg:order-3"
    >
      <span className="text-12 font-bold text-on-lime-soft">
        {BENTO.link.titulo}
      </span>
      <div className="flex items-center gap-1.5 rounded-panel bg-surface py-1.5 pr-1.5 pl-2.5">
        <span className="relative inline-flex w-42 items-center overflow-hidden text-13 font-semibold whitespace-nowrap text-ink">
          <span className="animate-hero-type overflow-hidden whitespace-nowrap">
            {DEMO.lank}
          </span>
          <span
            aria-hidden="true"
            className="ml-0.5 h-3.5 w-0.5 shrink-0 animate-hero-caret bg-ink"
          />
        </span>
        <span
          aria-hidden="true"
          className="relative inline-flex h-8 w-17.5 shrink-0 animate-hero-copy-btn items-center justify-center overflow-hidden rounded-control text-12 font-bold text-on-dark"
        >
          <span className="absolute animate-hero-copy-out">
            {BENTO.link.copiar}
          </span>
          <span className="absolute animate-hero-copy-in">
            {BENTO.link.copiado}
          </span>
        </span>
      </div>
      <div
        role="group"
        aria-label={BENTO.link.compartirAria}
        className="flex justify-end gap-2"
      >
        {SHARE_ICONS.map((item, i) => {
          const Icon = item.icon;
          return (
            <span
              key={i}
              aria-hidden="true"
              className={cn(
                "flex size-9 animate-hero-share items-center justify-center rounded-icon",
                item.tone === "dark"
                  ? "bg-ink text-on-dark"
                  : "bg-surface text-ink",
                SHARE_DELAY[i],
              )}
            >
              <Icon className="size-4" strokeWidth={strokeCard} />
            </span>
          );
        })}
      </div>
    </Card>
  );
}

function DisponibleTile() {
  return (
    <div className="relative flex animate-hero-sky flex-col justify-end overflow-hidden rounded-card bg-sky p-3.5">
      <div
        aria-hidden="true"
        className="absolute top-6 left-1/2 size-14 -translate-x-1/2 animate-hero-orbit"
      >
        <span className="absolute top-0 left-1/2 size-3.5 -translate-x-1/2 rounded-full bg-lime" />
        <span className="absolute bottom-0 left-1/2 size-3 -translate-x-1/2 rounded-full bg-surface" />
      </div>
      <div className="relative w-fit rounded-control bg-surface/90 px-2 py-1.5">
        <div className="font-display text-22 leading-none font-bold">
          {BENTO.disponible.valor}
        </div>
        <div className="text-10 text-muted">{BENTO.disponible.pie}</div>
      </div>
    </div>
  );
}

function ComisionTile() {
  return (
    <Card
      tone="dark"
      radius="card"
      padding="none"
      className="flex flex-col justify-between gap-2 p-3.5"
    >
      <span className="text-11 font-bold text-lime">
        {BENTO.comision.titulo}
      </span>
      <div className="h-10 overflow-hidden">
        <div className="flex animate-hero-comision flex-col font-display text-32 leading-10 font-bold">
          <span>15%</span>
          <span>10%</span>
          <span>5%</span>
          <span>{DEMO.comisionFinal}</span>
        </div>
      </div>
      <span className="text-10 text-on-dark-muted">{BENTO.comision.pie}</span>
    </Card>
  );
}

function HeroBentoGrid() {
  return (
    <div
      role="img"
      aria-label={copy.landing.hero.vistaPreviaAria}
      className="mt-9 grid grid-cols-2 gap-3.5 lg:h-115 lg:grid-cols-4 lg:grid-rows-2"
    >
      <PhotoTile />
      <CalendarTile />
      <LinkTile />
      <div className="order-4 col-span-2 grid grid-cols-2 gap-3.5 lg:order-4 lg:col-span-1">
        <DisponibleTile />
        <ComisionTile />
      </div>
    </div>
  );
}

export function HeroSection() {
  const [before, last] = splitLastWord(
    copy.landing.hero.titulo({ tagline: brand.tagline }),
  );
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface py-1.5 pr-3.5 pl-1.5 text-13 font-semibold text-ink">
          <Chip tone="lime" size="xs">
            {BENTO.nuevo.etiqueta}
          </Chip>
          {BENTO.nuevo.texto}
        </span>
        <h1 className="font-display text-30 leading-hero font-semibold tracking-display text-ink sm:text-40">
          {before}
          <span className="inline-block rounded-icon bg-lime px-3">{last}</span>
        </h1>
        <p className="max-w-xl text-17 leading-relaxed text-muted">
          {copy.landing.hero.subtitulo}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="primary" size="xl">
            <Link href="/login">{copy.landing.hero.ctaPrimario}</Link>
          </Button>
          <Button asChild variant="secondary" size="xl">
            <Link href="/barberia-norte">
              {copy.landing.hero.ctaSecundario}
            </Link>
          </Button>
        </div>
      </div>

      <HeroBentoGrid />
    </section>
  );
}
