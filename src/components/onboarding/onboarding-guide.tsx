// Onboardingens stegpanel (WP-92, ägarens referens "Hey, let's start now!"): mörk
// panel med "Kom igång", procent, lime progressbar och checklistan. Dator: fast
// till vänster. Mobil: kompakt rad överst ("Steg 2 av 8 · 25 %") som fälls ut.
import { ChevronDown } from "lucide-react";

import { ProgressBar } from "@/components/dashboard/progress-bar";
import { onboarding } from "@/i18n";

import { SetupChecklist, type ChecklistItem } from "./setup-checklist";

export function OnboardingGuide({
  items,
  current,
}: {
  items: readonly ChecklistItem[];
  /** 0-baserat index för det aktiva steget. */
  current: number;
}) {
  const t = onboarding.guia;
  const done = items.filter((i) => i.state === "done").length;
  const pct = Math.round((done / items.length) * 100);
  return (
    <>
      <aside className="sticky top-6 hidden flex-col gap-5 rounded-card bg-dark p-6 text-on-dark lg:flex">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-24 font-semibold tracking-title">
            {t.titulo}
          </h2>
          <span className="text-13 font-semibold text-lime">
            {t.progreso({ n: pct })}
          </span>
        </div>
        <ProgressBar value={done / items.length} tone="lime" />
        <SetupChecklist tone="dark" items={items} />
      </aside>

      <details className="group rounded-card bg-dark px-5 py-4 text-on-dark lg:hidden">
        <summary className="flex cursor-pointer list-none flex-col gap-3 focus-visible:outline-2 focus-visible:outline-lime">
          <span className="flex items-center justify-between gap-3">
            <span className="text-14 font-bold">
              {t.pasoDe({ n: current + 1, total: items.length })} ·{" "}
              {items[current]?.label}
            </span>
            <span className="flex items-center gap-1.5 text-13 font-semibold text-lime">
              {pct} %
              <ChevronDown
                aria-hidden="true"
                className="size-4 transition-transform duration-150 ease-out group-open:rotate-180"
                strokeWidth={2}
              />
              <span className="sr-only">{t.verPasos}</span>
            </span>
          </span>
          <ProgressBar value={done / items.length} tone="lime" />
        </summary>
        <SetupChecklist tone="dark" items={items} className="mt-3" />
      </details>
    </>
  );
}
