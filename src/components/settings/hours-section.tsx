"use client";

// Sección "Horario" (WP-15b slim): misma forma que onboarding (hours-step.tsx) — un solo
// intervalo por día, Abierto/Cerrado con un Pill — pero como una sección permanente con su
// propio "Guardar cambios" en vez de Volver/Continuar.
import { useState } from "react";

import { validateTimeRange } from "@/components/onboarding/client-validation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { ajustes, horarios } from "@/i18n";
import { WEEKDAY_LONG } from "@/lib/format/calendar";

import { ajustesErrorText } from "./error-text";
import type { AjustesActions, AjustesHour } from "./types";

export function HoursSection({
  hours,
  action,
}: {
  hours: AjustesHour[];
  action: AjustesActions["updateHours"];
}) {
  const [value, setValue] = useState<AjustesHour[]>(hours);
  const [errors, setErrors] = useState<(string | undefined)[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [submitError, setSubmitError] = useState<string | undefined>();

  function updateDay(i: number, patch: Partial<AjustesHour>) {
    setValue((prev) =>
      prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)),
    );
    setStatus("idle");
  }

  async function handleSubmit() {
    const nextErrors = value.map((h) => {
      if (!h.open) return undefined;
      const r = validateTimeRange(h.start, h.end);
      return r.ok ? undefined : ajustesErrorText(r.code);
    });
    setErrors(nextErrors);
    if (!nextErrors.every((e) => e === undefined)) return;

    setStatus("saving");
    setSubmitError(undefined);
    try {
      const result = await action(
        value.map((h) =>
          h.open
            ? h
            : {
                weekday: h.weekday,
                open: false,
                start: undefined,
                end: undefined,
              },
        ),
      );
      if (result.ok) {
        setStatus("saved");
      } else {
        setStatus("error");
        setSubmitError(ajustesErrorText(result.code));
      }
    } catch {
      setStatus("error");
      setSubmitError(ajustesErrorText("unknown"));
    }
  }

  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-4">
      <h2 className="text-18 font-bold text-ink">
        {ajustes.secciones.horario}
      </h2>

      <div className="flex flex-col gap-3">
        {value.map((h, i) => (
          <div
            key={h.weekday}
            className="flex flex-col gap-2 rounded-tile bg-canvas p-4"
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
                  className="h-11 w-full rounded-control border-2 border-transparent bg-surface px-3 text-15 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                />
                <span className="text-13 text-muted" aria-hidden="true">
                  –
                </span>
                <input
                  type="time"
                  aria-label={`${WEEKDAY_LONG[h.weekday - 1]}: término`}
                  value={h.end}
                  onChange={(e) => updateDay(i, { end: e.target.value })}
                  className="h-11 w-full rounded-control border-2 border-transparent bg-surface px-3 text-15 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                />
              </div>
            ) : null}
            {errors[i] ? (
              <span className="text-13 text-ink">{errors[i]}</span>
            ) : null}
          </div>
        ))}
      </div>

      {submitError ? (
        <p role="alert" className="text-13 font-semibold text-ink">
          {submitError}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="xl"
          disabled={status === "saving"}
          onClick={() => void handleSubmit()}
        >
          {status === "saving" ? ajustes.guardando : ajustes.guardarCambios}
        </Button>
        {status === "saved" ? (
          <span role="status" className="text-13 text-muted">
            {ajustes.cambiosGuardados}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
