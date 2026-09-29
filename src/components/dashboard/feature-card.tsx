// Se DESIGN.md §7 "FeatureCard" och docs/tasks/plans/WP-11.md §4 steg 4. Tre pastellkort i
// HeroSummary (lista de espera, horas flash, te echamos de menos). Nummer "01"/"02"/"03" är
// indexet, inte copy. `progress` saknas i referensens tredje kort (winback har en knapp i
// stället för en stapel).
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";

import { ProgressBar } from "./progress-bar";

export type FeatureCardTone = "lilac" | "peach" | "lime";

const META_TONE: Record<FeatureCardTone, string> = {
  lilac: "text-on-lilac-soft",
  peach: "text-on-peach-soft",
  lime: "text-on-lime-soft",
};

export type FeatureCardProps = {
  /** 1, 2, 3 … → "01", "02", "03". */
  index: number;
  tone: FeatureCardTone;
  icon: ReactNode;
  title: string;
  meta: string;
  progress?: number;
  /** Rund 34-knapp (t.ex. "Enviar recordatorio"), ersätter enkel metarad med en flexrad. */
  action?: ReactNode;
};

export function FeatureCard({
  index,
  tone,
  icon,
  title,
  meta,
  progress,
  action,
}: FeatureCardProps) {
  return (
    <Card
      tone={tone}
      radius="tile"
      padding="none"
      className="flex w-full flex-col p-5 lg:w-49"
    >
      <span className="text-13 font-semibold">
        {String(index).padStart(2, "0")}
      </span>
      <span aria-hidden="true" className="mt-7">
        {icon}
      </span>
      <h3 className="mt-3 text-19 leading-snug font-bold">{title}</h3>
      <div className="flex-1" />
      {action ? (
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-12", META_TONE[tone])}>{meta}</span>
          {action}
        </div>
      ) : (
        <span className={cn("text-12", META_TONE[tone])}>{meta}</span>
      )}
      {progress === undefined ? null : (
        <ProgressBar value={progress} className="mt-2" />
      )}
    </Card>
  );
}
