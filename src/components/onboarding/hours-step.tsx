"use client";

// Paso 3 de 4: Horario. Un solo intervalo por día (sin partir el día en dos, a diferencia
// de Ajustes/`horarios.bloqueos`: fuera del alcance de F1 en esta versión, ver el reporte
// de WP-15). Abierto/cerrado por día con un Pill; horas con <input type="time">.
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { WEEKDAY_LONG } from "@/lib/format/calendar";
import { horarios, onboarding } from "@/i18n";

import { validateTimeRange } from "./client-validation";
import { onboardingErrorText } from "./error-text";
import type { WizardHours } from "./types";

export type HoursStepProps = {
  value: WizardHours[];
  onChange: (value: WizardHours[]) => void;
  onBack: () => void;
  onContinue: () => void;
};

export function HoursStep({
  value,
  onChange,
  onBack,
  onContinue,
}: HoursStepProps) {
  const [errors, setErrors] = useState<(string | undefined)[]>([]);

  function updateDay(i: number, patch: Partial<WizardHours>) {
    onChange(value.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  }

  function handleContinue() {
    const nextErrors = value.map((h) => {
      if (!h.open) return undefined;
      const r = validateTimeRange(h.start, h.end);
      return r.ok ? undefined : onboardingErrorText(r.code);
    });
    setErrors(nextErrors);
    if (nextErrors.every((e) => e === undefined)) onContinue();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <p className="text-13 font-semibold text-muted">
          {onboarding.paso({ n: 3, total: 4 })}
        </p>
        <h1 className="text-22 font-bold tracking-title text-ink">
          {onboarding.pasos.horario}
        </h1>
        <p className="text-13 text-muted">{onboarding.intro.horario}</p>
      </div>

      <div className="flex flex-col gap-3">
        {value.map((h, i) => (
          <div
            key={h.weekday}
            className="flex flex-col gap-2 rounded-tile bg-surface p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-15 font-semibold text-ink">
                {WEEKDAY_LONG[h.weekday - 1]}
              </span>
              <Pill
                selected={h.open}
                onClick={() => updateDay(i, { open: !h.open })}
              >
                {h.open ? horarios.abierto : horarios.cerrado}
              </Pill>
            </div>
            {h.open ? (
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  aria-label={`${WEEKDAY_LONG[h.weekday - 1]}: inicio`}
                  value={h.start}
                  onChange={(e) => updateDay(i, { start: e.target.value })}
                  // WP-42: `min-w-0 flex-1` i stället för bara `w-full` — en `<input
                  // type="time">` har en egen intrinsic minimibredd (spinnern) som annars
                  // vinner mot flex-krympningen och tvingar raden bredare än 360 px.
                  className="h-11 min-w-0 flex-1 rounded-control border-2 border-transparent bg-canvas px-3 text-15 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                />
                <span className="text-13 text-muted" aria-hidden="true">
                  –
                </span>
                <input
                  type="time"
                  aria-label={`${WEEKDAY_LONG[h.weekday - 1]}: término`}
                  value={h.end}
                  onChange={(e) => updateDay(i, { end: e.target.value })}
                  className="h-11 min-w-0 flex-1 rounded-control border-2 border-transparent bg-canvas px-3 text-15 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                />
              </div>
            ) : null}
            {errors[i] ? (
              <span className="text-13 text-ink">{errors[i]}</span>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" size="xl" onClick={onBack}>
          {onboarding.ctaVolver}
        </Button>
        <Button
          type="button"
          size="xl"
          className="flex-1"
          onClick={handleContinue}
        >
          {onboarding.ctaContinuar}
        </Button>
      </div>
    </div>
  );
}
