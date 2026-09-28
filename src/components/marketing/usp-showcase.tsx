// Fyra USP-kort (WP-hemsida v2, punkt 3): samma fyra skäl som förut (`sitio.inicio.usp`),
// nu med en egen färgton var (lime/lavender/peach/mörk — "så de inte är likadana") och en
// liten dekorativ mini-mockup av en riktig UI-bit per kort (länk, mini-vecka, Llegó/No vino,
// prisnivåer), plus hover-lyft. `lavender` saknar en egen `on-lavender-soft`-token (bara
// lilac/peach/lime har en, DESIGN.md §4) — texten på det kortet använder bara `ink`; värt
// att lägga till en `--color-on-lavender-soft` i tokens.css/DESIGN.md om fler lavender-ytor
// tillkommer. Mini-mockuperna är dekorativa (`aria-hidden`) — rubrik, text och punktlista
// bär den faktiska informationen, precis som förut.
import {
  Banknote,
  Calendar,
  Check,
  Link2,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Card, type CardProps } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { copy } from "@/i18n/marketing";

type UspTone = "lime" | "lavender" | "peach" | "dark";

const TONE_CARD_PROPS: Record<
  UspTone,
  Pick<CardProps, "tone" | "className">
> = {
  lime: { tone: "lime", className: "" },
  lavender: { tone: "surface", className: "bg-lavender" },
  peach: { tone: "peach", className: "" },
  dark: { tone: "dark", className: "" },
};

const TONE_TEXT: Record<UspTone, string> = {
  lime: "text-on-lime-soft",
  lavender: "text-ink",
  peach: "text-on-peach-soft",
  dark: "text-on-dark-soft",
};

const TONE_ICON_BG: Record<UspTone, string> = {
  lime: "bg-ink text-on-dark",
  lavender: "bg-surface text-ink",
  peach: "bg-surface text-ink",
  dark: "bg-lime text-ink",
};

function LinkVisual() {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-11 font-semibold text-on-dark">
      <Link2 aria-hidden="true" className="size-3.5" strokeWidth={strokeCard} />
      tunegocio.cl/reservar
    </div>
  );
}

const WEEK_BARS = [
  { day: "L", height: 26 },
  { day: "M", height: 38 },
  { day: "M", height: 16 },
  { day: "J", height: 32 },
  { day: "V", height: 12 },
] as const;

function AgendaVisual() {
  return (
    <div className="flex items-end gap-1.5">
      {WEEK_BARS.map((bar, i) => (
        <span
          key={i}
          style={{ height: bar.height }}
          className="w-2 rounded-full bg-ink/70"
        />
      ))}
    </div>
  );
}

function AsistenciaVisual() {
  return (
    <div className="flex gap-1">
      <span className="rounded-chip bg-ink px-2.5 py-1 text-11 font-bold text-on-dark">
        {copy.hoy.acciones.llego}
      </span>
      <span className="rounded-chip bg-surface px-2.5 py-1 text-11 font-semibold text-ink">
        {copy.hoy.acciones.noVino}
      </span>
    </div>
  );
}

function PrecioVisual() {
  return (
    <div className="flex items-center gap-1 text-11 font-bold text-on-dark">
      <span className="rounded-full bg-lime px-2 py-0.5 text-ink">1</span>
      <span className="rounded-full bg-dark-2 px-2 py-0.5">2</span>
      <span className="rounded-full bg-dark-2 px-2 py-0.5">5</span>
    </div>
  );
}

const USP_ITEMS: readonly {
  tone: UspTone;
  icon: LucideIcon;
  visual: ReactNode;
  titulo: string;
  texto: string;
  puntos: readonly string[];
}[] = [
  {
    tone: "lime",
    icon: Link2,
    visual: <LinkVisual />,
    ...copy.sitio.inicio.usp.reservasSolas,
    puntos: Object.values(copy.sitio.inicio.usp.reservasSolas.puntos),
  },
  {
    tone: "lavender",
    icon: Calendar,
    visual: <AgendaVisual />,
    ...copy.sitio.inicio.usp.agendaOrdenada,
    puntos: Object.values(copy.sitio.inicio.usp.agendaOrdenada.puntos),
  },
  {
    tone: "peach",
    icon: UserCheck,
    visual: <AsistenciaVisual />,
    ...copy.sitio.inicio.usp.menosInasistencias,
    puntos: Object.values(copy.sitio.inicio.usp.menosInasistencias.puntos),
  },
  {
    tone: "dark",
    icon: Banknote,
    visual: <PrecioVisual />,
    ...copy.sitio.inicio.usp.precioUnico,
    puntos: Object.values(copy.sitio.inicio.usp.precioUnico.puntos),
  },
];

export function UspShowcase() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {USP_ITEMS.map((item) => {
        const Icon = item.icon;
        const cardProps = TONE_CARD_PROPS[item.tone];
        const isDark = item.tone === "dark";
        return (
          <Card
            key={item.titulo}
            radius="tile"
            padding="xl"
            tone={cardProps.tone}
            className={cn(
              "flex flex-col gap-4 transition-transform duration-150 ease-out hover:-translate-y-1",
              cardProps.className,
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-icon",
                  TONE_ICON_BG[item.tone],
                )}
              >
                <Icon className="size-5.5" strokeWidth={strokeCard} />
              </span>
              <div aria-hidden="true">{item.visual}</div>
            </div>
            <div className="flex flex-col gap-2">
              <h3
                className={cn(
                  "text-19 leading-snug font-bold",
                  isDark ? "text-on-dark" : "text-ink",
                )}
              >
                {item.titulo}
              </h3>
              <p className={cn("text-14", TONE_TEXT[item.tone])}>
                {item.texto}
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {item.puntos.map((punto) => (
                <li
                  key={punto}
                  className={cn(
                    "flex items-start gap-2 text-14",
                    isDark ? "text-on-dark" : "text-ink",
                  )}
                >
                  <Check
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      isDark ? "text-on-dark-muted" : "text-muted",
                    )}
                    strokeWidth={2.4}
                  />
                  {punto}
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
