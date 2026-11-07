"use client";

// Paso 3 de 4: Horario. Un solo intervalo por día (sin partir el día en dos, a diferencia
// de Ajustes/`horarios.bloqueos`: fuera del alcance de F1 en esta versión, ver el reporte
// de WP-15). Abierto/cerrado por día con un Pill; horas med `Time24Input` (WP-47, tillägg
// B) i stället för `<input type="time">` — 24-timmarsformat oavsett webbläsarens språk.
import { useState } from "react";

import { ConsentCheckbox } from "@/components/booking/consent-checkbox";
import { Pill } from "@/components/ui/pill";
import { Time24Input } from "@/components/ui/time24-input";
import { hrefLegal } from "@/config/routes";
import { WEEKDAY_LONG } from "@/lib/format/calendar";
import { horarios, onboarding } from "@/i18n";

import { validateTimeRange } from "./client-validation";
import { StepNav } from "./step-frame";
import { onboardingErrorText } from "./error-text";
import type { WizardHours } from "./types";

const LINK_CLASS =
  "font-semibold text-ink underline underline-offset-2 hover:text-pending-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export type HoursStepProps = {
  value: WizardHours[];
  onChange: (value: WizardHours[]) => void;
  /** WP-26 paso 6: casilla obligatoria de términos + encargo, regla dura 7
   * (nunca premarcada). Vive en el mismo paso que `onContinue` porque es la
   * última pantalla antes de enviar el formulario a `completeOnboarding`. */
  acceptedTerms: boolean;
  onAcceptedTermsChange: (value: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
};

export function HoursStep({
  value,
  onChange,
  acceptedTerms,
  onAcceptedTermsChange,
  onBack,
  onContinue,
}: HoursStepProps) {
  const [errors, setErrors] = useState<(string | undefined)[]>([]);
  const [termsError, setTermsError] = useState<string | undefined>();

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
    const nextTermsError = acceptedTerms
      ? undefined
      : onboardingErrorText("terms.not_accepted");
    setTermsError(nextTermsError);
    if (nextErrors.every((e) => e === undefined) && !nextTermsError) {
      onContinue();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-30 leading-snug font-semibold tracking-title text-ink sm:text-34">
          {onboarding.pasos.horario}
        </h1>
        <p className="text-15 leading-body text-muted">
          {onboarding.intro.horario}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {value.map((h, i) => (
          <div
            key={h.weekday}
            className="flex flex-col gap-2 rounded-tile bg-surface p-4 fields-on-surface"
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
                <Time24Input
                  aria-label={`${WEEKDAY_LONG[h.weekday - 1]}: inicio`}
                  value={h.start}
                  onChange={(e) => updateDay(i, { start: e.target.value })}
                  // WP-42: `min-w-0 flex-1` i stället för bara `w-full` — annars kan raden
                  // tvingas bredare än 360 px.
                  className="h-11 min-w-0 flex-1 rounded-control border-2 border-transparent bg-canvas px-3 text-15 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                />
                <span className="text-13 text-muted" aria-hidden="true">
                  –
                </span>
                <Time24Input
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

      <ConsentCheckbox
        checked={acceptedTerms}
        onChange={(checked) => {
          onAcceptedTermsChange(checked);
          if (checked) setTermsError(undefined);
        }}
        required
        error={termsError}
      >
        {onboarding.terminos.prefijo}{" "}
        <a
          href={hrefLegal("terminos")}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          {onboarding.terminos.terminosLinkTexto}
        </a>{" "}
        {onboarding.terminos.medio}{" "}
        <a
          href={hrefLegal("encargo")}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          {onboarding.terminos.encargoLinkTexto}
        </a>
        {onboarding.terminos.sufijo}
      </ConsentCheckbox>

      <StepNav
        onBack={onBack}
        onContinue={handleContinue}
        continueLabel={onboarding.ctaContinuar}
      />
    </div>
  );
}
