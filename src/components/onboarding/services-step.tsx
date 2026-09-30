"use client";

// Paso 1 de 4: Servicios. Lista dinámica, "Agregar servicio"/"Eliminar servicio". Vacía →
// el botón de continuar se convierte en "Saltar este paso" (mismo texto, misma acción:
// seguir con un array vacío — el negocio simplemente no recibe reservas todavía, ver
// `onboarding.avisoSinServicios`).
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { onboarding, servicios } from "@/i18n";

import {
  validateDurationMin,
  validatePriceClp,
  validateRequired,
} from "./client-validation";
import { onboardingErrorText } from "./error-text";
import type { WizardService } from "./types";

export type ServicesStepProps = {
  value: WizardService[];
  onChange: (value: WizardService[]) => void;
  onBack: () => void;
  onContinue: () => void;
};

type RowErrors = { name?: string; durationMin?: string; priceClp?: string };

export function ServicesStep({
  value,
  onChange,
  onBack,
  onContinue,
}: ServicesStepProps) {
  const [errors, setErrors] = useState<RowErrors[]>([]);

  function updateRow(i: number, patch: Partial<WizardService>) {
    onChange(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function addRow() {
    onChange([...value, { name: "", durationMin: "", priceClp: "" }]);
  }

  function removeRow(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
    setErrors((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleContinue() {
    const nextErrors = value.map((s): RowErrors => {
      const name = validateRequired(s.name, "services.name_empty");
      const durationMin = validateDurationMin(s.durationMin);
      const priceClp = validatePriceClp(s.priceClp);
      const row: RowErrors = {};
      if (!name.ok) row.name = onboardingErrorText(name.code);
      if (!durationMin.ok)
        row.durationMin = onboardingErrorText(durationMin.code);
      if (!priceClp.ok) row.priceClp = onboardingErrorText(priceClp.code);
      return row;
    });
    setErrors(nextErrors);
    if (nextErrors.every((r) => Object.keys(r).length === 0)) onContinue();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <p className="text-13 font-semibold text-muted">
          {onboarding.paso({ n: 1, total: 5 })}
        </p>
        <h1 className="text-22 font-bold tracking-title text-ink">
          {onboarding.pasos.servicios}
        </h1>
        <p className="text-13 text-muted">{onboarding.intro.servicios}</p>
      </div>

      {value.length === 0 ? (
        <p className="text-13 text-muted">{servicios.vacio}</p>
      ) : null}

      <div className="flex flex-col gap-4">
        {value.map((s, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-tile bg-surface p-4 fields-on-surface"
          >
            <TextField
              label={servicios.campos.nameLabel}
              placeholder={servicios.campos.namePlaceholder}
              value={s.name}
              onChange={(e) => updateRow(i, { name: e.target.value })}
              error={errors[i]?.name}
              maxLength={120}
            />
            <div className="flex gap-3">
              <TextField
                label={servicios.campos.durationLabel}
                inputMode="numeric"
                value={s.durationMin}
                onChange={(e) => updateRow(i, { durationMin: e.target.value })}
                error={errors[i]?.durationMin}
              />
              <TextField
                label={servicios.campos.priceLabel}
                inputMode="numeric"
                placeholder={servicios.campos.pricePlaceholder}
                value={s.priceClp}
                onChange={(e) => updateRow(i, { priceClp: e.target.value })}
                error={errors[i]?.priceClp}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() => removeRow(i)}
            >
              {servicios.ctaEliminar}
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="secondary" size="lg" onClick={addRow}>
        {servicios.ctaAgregar}
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
