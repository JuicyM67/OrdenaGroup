"use client";

// Orquestador del onboarding (F1, WP-15 slim). `business` es la pantalla inicial, sin
// numerar (mismo criterio que el comentario de `negocio` en es-CL.ts: "onboarding paso 1"
// no aparece en `onboarding.pasos`, que solo tiene 4 llaves — servicios/equipo/horario/link).
// Todo se guarda en un único server action al final del paso "horario" (antes de mostrar
// "Tu link"): no hay persistencia parcial entre pasos (alcance reducido, ver el reporte).
import { useState } from "react";

import { onboarding } from "@/i18n";

import { BusinessStep } from "./business-step";
import { DoneStep } from "./done-step";
import { onboardingErrorText } from "./error-text";
import { HoursStep } from "./hours-step";
import { ServicesStep } from "./services-step";
import { StaffStep } from "./staff-step";
import type {
  OnboardingSubmitResult,
  StepId,
  WizardData,
  WizardHours,
} from "./types";

const DEFAULT_HOURS: WizardHours[] = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday: weekday as WizardHours["weekday"],
  open: weekday <= 5,
  start: "09:00",
  end: weekday === 6 ? "14:00" : "19:00",
}));

function initialData(): WizardData {
  return {
    business: {
      name: "",
      slug: "",
      slugTouched: false,
      comuna: "",
      category: "",
      phone: "",
    },
    services: [],
    staff: [],
    hours: DEFAULT_HOURS,
  };
}

export type OnboardingWizardProps = {
  onSubmit: (input: unknown) => Promise<OnboardingSubmitResult>;
};

export function OnboardingWizard({ onSubmit }: OnboardingWizardProps) {
  const [step, setStep] = useState<StepId>("business");
  const [data, setData] = useState<WizardData>(initialData);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [result, setResult] = useState<OnboardingSubmitResult | undefined>();

  async function finish() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      const r = await onSubmit({
        business: data.business,
        services: data.services.map((s) => ({
          name: s.name,
          durationMin: s.durationMin,
          priceClp: s.priceClp,
        })),
        staff: data.staff,
        hours: data.hours.map((h) =>
          h.open
            ? h
            : {
                weekday: h.weekday,
                open: false,
                start: undefined,
                end: undefined,
              },
        ),
      });
      if (r.ok) {
        setResult(r);
        setStep("done");
      } else {
        setSubmitError(onboardingErrorText(r.code));
      }
    } catch {
      setSubmitError(onboardingErrorText("unknown"));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done" && result?.ok) {
    return (
      <DoneStep
        slug={result.slug}
        businessName={data.business.name}
        hasServices={data.services.length > 0}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {submitError ? (
        <p role="alert" className="text-13 font-semibold text-ink">
          {submitError}
        </p>
      ) : null}

      {step === "business" ? (
        <BusinessStep
          value={data.business}
          onChange={(business) => setData({ ...data, business })}
          onContinue={() => setStep("services")}
        />
      ) : null}

      {step === "services" ? (
        <ServicesStep
          value={data.services}
          onChange={(services) => setData({ ...data, services })}
          onBack={() => setStep("business")}
          onContinue={() => setStep("staff")}
        />
      ) : null}

      {step === "staff" ? (
        <StaffStep
          value={data.staff}
          services={data.services}
          onChange={(staff) => setData({ ...data, staff })}
          onBack={() => setStep("services")}
          onContinue={() => setStep("hours")}
        />
      ) : null}

      {step === "hours" ? (
        <HoursStep
          value={data.hours}
          onChange={(hours) => setData({ ...data, hours })}
          onBack={() => setStep("staff")}
          onContinue={() => void finish()}
        />
      ) : null}

      {submitting ? (
        <p role="status" className="text-13 text-muted">
          {onboarding.paso({ n: 4, total: 4 })}
        </p>
      ) : null}
    </div>
  );
}
