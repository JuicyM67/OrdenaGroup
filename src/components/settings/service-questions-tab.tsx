"use client";

// Flik "Frågor vid bokning" i tjänstens redigering (vy B,
// `falt-B-per-tjanst.html`, WP-40 steg 7, D-031). Delar data och komponenter
// med vy A (`QuestionEditor`, `AppliesToPanel`), filtrerat till en tjänst.
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { formulario } from "@/i18n";

import { AppliesToPanel } from "./applies-to-panel";
import { bookingFormErrorText } from "./booking-form-error-text";
import {
  industryForBusinessCategory,
  industryLabel,
  presetsForIndustry,
} from "./booking-form-industry";
import { questionsApplyingToService } from "./booking-form-resolve";
import type {
  BookingFormActions,
  BookingFormQuestion,
  BookingFormSettings,
  CreateResult,
  MutationResult,
} from "./booking-form-types";
import { QuestionEditor } from "./question-editor";

export type ServiceQuestionsTabProps = {
  serviceId: string;
  settings: BookingFormSettings;
  businessCategory: string | null;
  actions: BookingFormActions;
  onReload: () => Promise<void>;
};

/** Kan bara tas bort direkt om frågan har ett uttryckligt mål på just den
 * här tjänsten (`applies_to = 'targets'`, `serviceIds` innehåller den). En
 * fråga som gäller via "alla tjänster" eller via tjänstens kategori kan inte
 * tas bort för bara en tjänst här — ägaren får ändra "Gäller för" i stället
 * (vy A). Se rapporten. */
function canRemoveDirectly(q: BookingFormQuestion, serviceId: string): boolean {
  return q.appliesTo === "targets" && q.serviceIds.includes(serviceId);
}

export function ServiceQuestionsTab({
  serviceId,
  settings,
  businessCategory,
  actions,
  onReload,
}: ServiceQuestionsTabProps) {
  const [newQuestionOpen, setNewQuestionOpen] = useState(false);
  const [useInOtherServices, setUseInOtherServices] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [targetsIdAfterCreate, setTargetsIdAfterCreate] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | undefined>();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const service = settings.services.find((s) => s.id === serviceId);
  const industry = industryForBusinessCategory(businessCategory);
  const applying = service
    ? questionsApplyingToService(
        settings.questions,
        service,
        settings.maxPerService,
      )
    : [];

  const unusedPresets = industry
    ? presetsForIndustry(industry).filter((preset) => {
        const existing = settings.questions.find(
          (q) => q.presetKey === preset.key,
        );
        return !existing || !applying.some((q) => q.id === existing.id);
      })
    : [];

  async function withReload<T extends MutationResult | CreateResult>(
    run: () => Promise<T>,
  ): Promise<T> {
    const result = await run();
    if (result.ok) {
      await onReload();
    } else {
      setError(bookingFormErrorText(result.code));
    }
    return result;
  }

  async function removeFromService(q: BookingFormQuestion) {
    setPendingId(q.id);
    try {
      const nextServiceIds = q.serviceIds.filter((id) => id !== serviceId);
      await withReload(() =>
        actions.setQuestionTargets(q.id, {
          appliesTo: "targets",
          serviceIds: nextServiceIds,
          categoryIds: q.categoryIds,
        }),
      );
    } finally {
      setPendingId(null);
    }
  }

  async function addPreset(presetKey: string) {
    setPendingId(presetKey);
    try {
      const existing = settings.questions.find(
        (q) => q.presetKey === presetKey,
      );
      if (existing) {
        await withReload(() =>
          actions.setQuestionTargets(existing.id, {
            appliesTo: "targets",
            serviceIds: [...new Set([...existing.serviceIds, serviceId])],
            categoryIds: existing.categoryIds,
          }),
        );
      } else if (industry) {
        await withReload(() =>
          actions.activatePreset({
            industry,
            presetKey,
            targets: {
              appliesTo: "targets",
              serviceIds: [serviceId],
              categoryIds: [],
            },
          }),
        );
      }
    } finally {
      setPendingId(null);
    }
  }

  const targetsQuestion =
    settings.questions.find((q) => q.id === targetsIdAfterCreate) ?? null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-12 font-bold tracking-caps text-muted uppercase">
        {formulario.preguntasContador({
          n: applying.length,
          max: settings.maxPerService,
        })}
      </p>

      <div className="flex flex-col gap-2">
        {applying.map((q) => {
          const others = q.serviceIds.filter((id) => id !== serviceId);
          const otherNames = settings.services
            .filter((s) => others.includes(s.id))
            .map((s) => s.name);
          return (
            <div
              key={q.id}
              className="flex items-center gap-3 rounded-event bg-canvas px-3.5 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-14 font-bold text-ink">{q.label}</p>
                <p className="truncate text-12 text-muted">
                  {formulario.tipos[q.kind]}
                  {otherNames.length > 0
                    ? ` · ${formulario.servicioPregunta.tambienUsadaEn({ servicios: otherNames.join(", ") })}`
                    : ""}
                </p>
              </div>
              <Chip
                tone={q.required ? "ink" : "neutral"}
                size="sm"
                weight={q.required ? "bold" : "default"}
              >
                {q.required ? formulario.obligatoria : formulario.opcional}
              </Chip>
              {canRemoveDirectly(q, serviceId) ? (
                <button
                  type="button"
                  disabled={pendingId === q.id}
                  onClick={() => void removeFromService(q)}
                  className="shrink-0 text-12 font-semibold text-ink underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  {formulario.servicioPregunta.ctaQuitar}
                </button>
              ) : null}
            </div>
          );
        })}
        {applying.length === 0 ? (
          // TODO_COPY: falta un texto para "este servicio no tiene
          // preguntas todavía" — no hay una clave en `formulario` para
          // esto, ver el reporte del WP-40.
          <p className="text-13 text-muted">
            Este servicio no tiene preguntas todavía.
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-13 font-semibold text-ink">
          {error}
        </p>
      ) : null}

      {newQuestionOpen ? (
        <QuestionEditor
          onCancel={() => setNewQuestionOpen(false)}
          onSubmit={async (fields) => {
            const result = await withReload(() =>
              actions.createQuestion({
                question: fields,
                targets: {
                  appliesTo: "targets",
                  serviceIds: [serviceId],
                  categoryIds: [],
                },
              }),
            );
            if (result.ok) {
              setNewQuestionOpen(false);
              if (useInOtherServices && "id" in result)
                setTargetsIdAfterCreate(result.id);
            }
            return result;
          }}
          footer={
            <label className="flex items-center gap-2 text-12 text-muted">
              <input
                type="checkbox"
                checked={useInOtherServices}
                onChange={(e) => setUseInOtherServices(e.target.checked)}
                className="size-4 accent-ink"
              />
              {formulario.servicioPregunta.usarEnOtrosServicios}
            </label>
          }
        />
      ) : null}

      {targetsQuestion && service ? (
        <AppliesToPanel
          questionLabel={targetsQuestion.label}
          categories={settings.categories}
          services={settings.services}
          initial={
            targetsQuestion.appliesTo === "all"
              ? { appliesTo: "all" }
              : {
                  appliesTo: "targets",
                  serviceIds: targetsQuestion.serviceIds,
                  categoryIds: targetsQuestion.categoryIds,
                }
          }
          onCancel={() => setTargetsIdAfterCreate(null)}
          onSave={(targets) =>
            withReload(() =>
              actions.setQuestionTargets(targetsQuestion.id, targets),
            )
          }
        />
      ) : null}

      {suggestionsOpen ? (
        <div className="flex flex-col gap-2 rounded-tile bg-canvas p-3">
          {unusedPresets.map((preset) => (
            <div key={preset.key} className="flex items-center gap-3 py-1">
              <div className="min-w-0 flex-1">
                <p className="truncate text-13 font-semibold text-ink">
                  {preset.label}
                </p>
                <p className="text-12 text-muted">
                  {formulario.tipos[preset.type]}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="xs"
                disabled={pendingId === preset.key}
                onClick={() => void addPreset(preset.key)}
              >
                {formulario.ctaNuevaPregunta}
              </Button>
            </div>
          ))}
          {unusedPresets.length === 0 ? (
            // TODO_COPY: falta un texto para "no hay más sugerencias para
            // este servicio" — no hay una clave en `formulario` para esto,
            // ver el reporte del WP-40.
            <p className="text-13 text-muted">
              No hay más sugerencias para este servicio.
            </p>
          ) : null}
        </div>
      ) : null}

      {!newQuestionOpen ? (
        <div className="flex gap-2">
          {industry ? (
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={() => setSuggestionsOpen((v) => !v)}
            >
              {formulario.servicioPregunta.ctaDesdeSugerencias({
                bransch: industryLabel(industry),
              })}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => setNewQuestionOpen(true)}
          >
            {formulario.servicioPregunta.ctaPreguntaPropia}
          </Button>
        </div>
      ) : null}

      {!newQuestionOpen ? (
        <p className="rounded-event bg-peach-50 px-2.5 py-2 text-12 text-on-peach-soft">
          {formulario.avisoDatosSensibles}
        </p>
      ) : null}
    </div>
  );
}
