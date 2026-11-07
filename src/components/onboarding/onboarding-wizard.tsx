"use client";

// Orquestador del onboarding (F1, WP-15 slim; WP-83 "Comenzar", portad från BookingBuddy
// WP-92): stegpanel till vänster (`OnboardingGuide`) och ett steg i taget till höger.
// Ordning: importen först (om den finns, WP-66) → Företaget → Rubro → Plats och kontakt →
// Tjänster → Personal → Öppettider → [företaget skapas, laddningsvy] → Din sida → Plan →
// Din länk. Allt sparas i ett enda server action efter Öppettider, som förut. Planvalet
// betalar ingenting (D-068): Gratis = fortsätt, betald plan = önskemål till teamet.
import { useState } from "react";

import { onboarding } from "@/i18n";

import {
  BusinessCategoryStep,
  BusinessNameStep,
  BusinessPlaceStep,
} from "./business-step";
import { DoneStep } from "./done-step";
import { onboardingErrorText } from "./error-text";
import { HoursStep } from "./hours-step";
import { ImportChoiceStep } from "./import-choice-step";
import { applyImportToWizard } from "./import-to-wizard";
import { LoadingChecklist } from "./loading-checklist";
import { OnboardingGuide } from "./onboarding-guide";
import { PageStep } from "./page-step";
import { PlanStep, type RequestPlanResult } from "./plan-step";
import { ServicesStep } from "./services-step";
import type { ChecklistItem } from "./setup-checklist";
import { StaffStep } from "./staff-step";
import type {
  OnboardingSubmitResult,
  PageStepActions,
  StepId,
  WizardData,
  WizardHours,
  WizardPageDefaults,
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
  /** WP-51: paso "Tu página", mostrado después de crear el negocio. */
  pageActions: PageStepActions;
  /** WP-66: "¿Ya tienes una página de reservas?" — `undefined` = oculto
   * (sin ANTHROPIC_API_KEY ni modo falso, D-035). */
  importer?: { platformNames: string };
  /** WP-83 (D-068): planval efter "Din sida". Ingen betalning: en betald plan
   * registreras som önskemål och teamet aktiverar den. `undefined` = inget
   * planval (planen styrs redan av admin). */
  onRequestPlan?: (
    plan: "emprende" | "equipo" | "local",
  ) => Promise<RequestPlanResult>;
};

export function OnboardingWizard({
  onSubmit,
  pageActions,
  importer,
  onRequestPlan,
}: OnboardingWizardProps) {
  const screens: StepId[] = [
    ...(importer ? (["inicio"] as const) : []),
    "negocio",
    "rubro",
    "lugar",
    "services",
    "staff",
    "hours",
    "pagina",
    ...(onRequestPlan ? (["plan"] as const) : []),
  ];
  const [step, setStep] = useState<StepId>(screens[0]!);
  const [data, setData] = useState<WizardData>(initialData);
  const [pageDefaults, setPageDefaults] = useState<
    WizardPageDefaults | undefined
  >();
  // WP-26 paso 6: casilla obligatoria de términos + encargo (regla dura 7,
  // nunca premarcada), mostrada en HoursStep (el último paso antes de
  // enviar). No vive en `WizardData` porque solo la usa este paso.
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [result, setResult] = useState<OnboardingSubmitResult | undefined>();

  async function finish() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      // WP-83: laddningsvyn visas minst ~2,5 s så att stegen hinner bockas av.
      const minDelay = new Promise((res) => setTimeout(res, 2500));
      const r = await onSubmit({
        business: data.business,
        services: data.services.map((s) => ({
          name: s.name,
          durationMin: s.durationMin,
          priceClp: s.priceClp,
          ...(s.description ? { description: s.description } : {}),
          ...(s.category ? { category: s.category } : {}),
        })),
        staff: data.staff.map((st) => ({
          name: st.name,
          serviceIndexes: st.serviceIndexes,
          ...(st.title ? { title: st.title } : {}),
        })),
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
        acceptedTerms,
      });
      await minDelay;
      if (r.ok) {
        setResult(r);
        // WP-51: el negocio ya existe acá — el paso "Tu página" (edita ese
        // negocio real vía `pageActions`) va antes de "Tu link", no "done"
        // directamente.
        go("pagina");
      } else {
        setSubmitError(onboardingErrorText(r.code));
      }
    } catch {
      setSubmitError(onboardingErrorText("unknown"));
    } finally {
      setSubmitting(false);
    }
  }

  const go = (id: StepId) => {
    setStep(id);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };
  const at = (offset: number): StepId =>
    screens[
      Math.min(screens.length - 1, Math.max(0, screens.indexOf(step) + offset))
    ]!;
  const next = () => go(at(1));
  const back = () => go(at(-1));
  const afterPage = () => go(onRequestPlan ? "plan" : "done");

  const current = step === "done" ? screens.length : screens.indexOf(step);
  const labels = onboarding.guia.pasos;
  const guideItems: ChecklistItem[] = screens.map((id, i) => ({
    key: id,
    label:
      id === "inicio"
        ? labels.inicio
        : id === "negocio"
          ? labels.negocio
          : id === "rubro"
            ? labels.rubro
            : id === "lugar"
              ? labels.lugar
              : id === "services"
                ? labels.servicios
                : id === "staff"
                  ? labels.equipo
                  : id === "hours"
                    ? labels.horario
                    : id === "pagina"
                      ? labels.pagina
                      : onboarding.planPaso.titulo,
    state: i < current ? "done" : i === current ? "current" : "todo",
  }));

  let body: React.ReactNode = null;
  if (submitting) {
    body = (
      <LoadingChecklist
        title={onboarding.creando.titulo}
        text={onboarding.creando.texto}
        steps={Object.values(onboarding.creando.pasos)}
        stepMs={700}
      />
    );
  } else if (step === "done" && result?.ok) {
    body = (
      <DoneStep
        slug={result.slug}
        businessName={data.business.name}
        hasServices={data.services.length > 0}
      />
    );
  } else if (step === "plan" && result?.ok && onRequestPlan) {
    body = <PlanStep onRequest={onRequestPlan} onContinue={() => go("done")} />;
  } else if (step === "pagina" && result?.ok) {
    body = (
      <PageStep
        phone={data.business.phone}
        actions={pageActions}
        initial={pageDefaults}
        onContinue={afterPage}
        onSkip={afterPage}
      />
    );
  } else if (step === "inicio" && importer) {
    body = (
      <ImportChoiceStep
        platformNames={importer.platformNames}
        onImported={(choice) => {
          const imported = applyImportToWizard(data, choice);
          setData(imported.data);
          setPageDefaults(imported.page);
          go("negocio");
        }}
        onSkip={next}
      />
    );
  } else if (step === "negocio") {
    body = (
      <BusinessNameStep
        value={data.business}
        onChange={(business) => setData({ ...data, business })}
        onBack={importer ? back : undefined}
        onContinue={next}
      />
    );
  } else if (step === "rubro") {
    body = (
      <BusinessCategoryStep
        value={data.business}
        onChange={(business) => setData({ ...data, business })}
        onBack={back}
        onContinue={next}
      />
    );
  } else if (step === "lugar") {
    body = (
      <BusinessPlaceStep
        value={data.business}
        onChange={(business) => setData({ ...data, business })}
        onBack={back}
        onContinue={next}
      />
    );
  } else if (step === "services") {
    body = (
      <ServicesStep
        value={data.services}
        onChange={(services) => setData({ ...data, services })}
        onBack={back}
        onContinue={next}
      />
    );
  } else if (step === "staff") {
    body = (
      <StaffStep
        value={data.staff}
        services={data.services}
        onChange={(staff) => setData({ ...data, staff })}
        onBack={back}
        onContinue={next}
      />
    );
  } else if (step === "hours") {
    body = (
      <HoursStep
        value={data.hours}
        onChange={(hours) => setData({ ...data, hours })}
        acceptedTerms={acceptedTerms}
        onAcceptedTermsChange={setAcceptedTerms}
        onBack={back}
        onContinue={() => void finish()}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-6">
      <OnboardingGuide
        items={guideItems}
        current={Math.min(current, screens.length - 1)}
      />
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
        {submitError ? (
          <p
            role="alert"
            className="rounded-tile bg-alert-bg px-4 py-3 text-14 font-semibold text-alert-fg"
          >
            {submitError}
          </p>
        ) : null}
        {submitting ? (
          body
        ) : (
          <section
            key={step}
            className="animate-fade-up rounded-card bg-surface p-6 shadow-soft fields-on-surface sm:p-8 lg:p-10"
          >
            {body}
          </section>
        )}
      </div>
    </div>
  );
}
