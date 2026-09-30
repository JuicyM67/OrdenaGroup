"use client";

// Paso 2 de 4: Equipo. Nombre + qué servicios hace cada persona (pills de los servicios del
// paso anterior). El color (staff-1…6) se asigna automáticamente por orden, no se elige acá
// (fuera del alcance de F1 en esta versión, ver el reporte de WP-15).
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { TextField } from "@/components/ui/text-field";
import { onboarding, profesionales } from "@/i18n";

import { validateRequired } from "./client-validation";
import { onboardingErrorText } from "./error-text";
import type { WizardService, WizardStaff } from "./types";

export type StaffStepProps = {
  value: WizardStaff[];
  services: WizardService[];
  onChange: (value: WizardStaff[]) => void;
  onBack: () => void;
  onContinue: () => void;
};

export function StaffStep({
  value,
  services,
  onChange,
  onBack,
  onContinue,
}: StaffStepProps) {
  const [errors, setErrors] = useState<(string | undefined)[]>([]);

  function updateRow(i: number, patch: Partial<WizardStaff>) {
    onChange(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function toggleService(i: number, serviceIndex: number) {
    const row = value[i];
    if (!row) return;
    const has = row.serviceIndexes.includes(serviceIndex);
    updateRow(i, {
      serviceIndexes: has
        ? row.serviceIndexes.filter((x) => x !== serviceIndex)
        : [...row.serviceIndexes, serviceIndex],
    });
  }

  function addRow() {
    onChange([...value, { name: "", serviceIndexes: [] }]);
  }

  function removeRow(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
    setErrors((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleContinue() {
    const nextErrors = value.map((s) => {
      const name = validateRequired(s.name, "staff.name_empty");
      return name.ok ? undefined : onboardingErrorText(name.code);
    });
    setErrors(nextErrors);
    if (nextErrors.every((e) => e === undefined)) onContinue();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <p className="text-13 font-semibold text-muted">
          {onboarding.paso({ n: 2, total: 5 })}
        </p>
        <h1 className="text-22 font-bold tracking-title text-ink">
          {onboarding.pasos.equipo}
        </h1>
        <p className="text-13 text-muted">{onboarding.intro.equipo}</p>
      </div>

      {/* WP-47 (tillägg C): `profesionales.vacio` är samma text som `onboarding.intro.equipo`
          ovan (se es-CL.ts, `AGREGA_EQUIPO_VACIO`) — visades dubblerat när listan var tom. */}

      <div className="flex flex-col gap-4">
        {value.map((s, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-tile bg-surface p-4 fields-on-surface"
          >
            <TextField
              label={profesionales.campos.nameLabel}
              value={s.name}
              onChange={(e) => updateRow(i, { name: e.target.value })}
              error={errors[i]}
              maxLength={120}
            />
            {services.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="text-13 font-semibold text-ink">
                  {profesionales.campos.serviciosLabel}
                </span>
                <div className="flex flex-wrap gap-2">
                  {services.map((svc, si) => (
                    <Pill
                      key={si}
                      selected={s.serviceIndexes.includes(si)}
                      onClick={() => toggleService(i, si)}
                    >
                      {svc.name || serviceFallbackLabel(si)}
                    </Pill>
                  ))}
                </div>
              </div>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() => removeRow(i)}
            >
              {profesionales.ctaEliminar}
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="secondary" size="lg" onClick={addRow}>
        {profesionales.ctaAgregar}
      </Button>

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
          {value.length === 0 ? onboarding.ctaSaltar : onboarding.ctaContinuar}
        </Button>
      </div>
    </div>
  );
}

function serviceFallbackLabel(i: number): string {
  return `#${i + 1}`;
}
