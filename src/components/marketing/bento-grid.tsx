// Bentogrid för "Todo lo que necesitas" (WP-hemsida v2, punkt 6): ersätter den gamla
// "Beneficios"-sektionen (samma sex poster, `BENEFICIOS` i page.tsx — "använd befintliga
// features-data"), nu med olika rutstorlekar (col-span) och bakgrunder i stället för ett
// enda enhetligt rutnät, så den tydligt skiljer sig från USP-sektionen ovanför. Två rutor
// får en liten mockup av en riktig UI-bit (länk-pill, prisnivåer) — samma dekorativa
// mönster som usp-showcase.tsx (`aria-hidden`, ren illustration). `imageSrc` (punkt 8,
// sparsamt) lägger en bakgrundsbild + mörk overlay bakom den första (största) rutan, bara
// dekorativ (`alt=""`) eftersom rutans egen rubrik/text redan bär informationen.
import { Link2, type LucideIcon } from "lucide-react";
import Image from "next/image";

import { Card, type CardProps } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { DEMO } from "./demo-data";

export type BentoItem = {
  icon: LucideIcon;
  titulo: string;
  texto: string;
};

// Layout per index (samma ordning som BENEFICIOS i page.tsx: linkPropio,
// agendaPorProfesional, recordatorios, listaDeEspera, abono, precioUnico).
const LAYOUT: readonly {
  span: string;
  tone: NonNullable<CardProps["tone"]>;
  text: string;
  iconBg: string;
  mockup?: "link" | "precio";
}[] = [
  {
    span: "col-span-6 sm:col-span-4 min-h-64",
    tone: "dark",
    text: "text-on-dark",
    iconBg: "bg-lime text-ink",
    mockup: "link",
  },
  {
    span: "col-span-6 sm:col-span-2 min-h-64",
    tone: "lime",
    text: "text-on-lime-soft",
    iconBg: "bg-ink text-on-dark",
  },
  {
    span: "col-span-6 sm:col-span-2",
    tone: "surface",
    text: "text-muted",
    iconBg: "bg-canvas text-ink",
  },
  {
    span: "col-span-6 sm:col-span-2",
    tone: "peach",
    text: "text-on-peach-soft",
    iconBg: "bg-surface text-ink",
  },
  {
    span: "col-span-6 sm:col-span-2",
    tone: "surface",
    text: "text-muted",
    iconBg: "bg-canvas text-ink",
  },
  {
    span: "col-span-6",
    tone: "dark-2",
    text: "text-on-dark-soft",
    iconBg: "bg-lime text-ink",
    mockup: "precio",
  },
];

function LinkMockup() {
  return (
    <div
      aria-hidden="true"
      className="flex w-fit items-center gap-1.5 rounded-full bg-dark-2 px-3 py-1.5 text-11 font-semibold text-on-dark"
    >
      <Link2 aria-hidden="true" className="size-3.5" strokeWidth={strokeCard} />
      {DEMO.lank}
    </div>
  );
}

function PrecioMockup() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-1 text-11 font-bold text-ink"
    >
      <span className="rounded-full bg-ink px-2 py-0.5 text-on-dark">1</span>
      <span className="rounded-full bg-surface px-2 py-0.5">2</span>
      <span className="rounded-full bg-surface px-2 py-0.5">5</span>
    </div>
  );
}

export function BentoGrid({
  items,
  imageSrc,
}: {
  items: readonly BentoItem[];
  /** Bakgrundsbild för den första (största) rutan, se filkommentaren. */
  imageSrc?: string;
}) {
  return (
    <div className="grid grid-cols-6 gap-5">
      {items.map((item, i) => {
        const layout = LAYOUT[i % LAYOUT.length]!;
        const Icon = item.icon;
        return (
          <Card
            key={item.titulo}
            tone={layout.tone}
            radius="tile"
            padding="xl"
            className={cn(
              "relative flex flex-col justify-between gap-4 overflow-hidden",
              layout.span,
            )}
          >
            {i === 0 && imageSrc ? (
              <>
                <Image
                  src={imageSrc}
                  alt=""
                  fill
                  sizes="(min-width: 1152px) 768px, 100vw"
                  className="object-cover"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-ink/75"
                />
              </>
            ) : null}
            <div className="relative flex items-start justify-between gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-icon",
                  layout.iconBg,
                )}
              >
                <Icon className="size-5.5" strokeWidth={strokeCard} />
              </span>
              {layout.mockup === "link" ? <LinkMockup /> : null}
              {layout.mockup === "precio" ? <PrecioMockup /> : null}
            </div>
            <div className="relative flex flex-col gap-1.5">
              <h3
                className={cn(
                  "text-19 leading-snug font-bold",
                  layout.tone === "dark" || layout.tone === "dark-2"
                    ? "text-on-dark"
                    : "text-ink",
                )}
              >
                {item.titulo}
              </h3>
              <p className={cn("text-14", layout.text)}>{item.texto}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
