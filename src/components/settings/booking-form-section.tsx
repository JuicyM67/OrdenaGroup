"use client";

// Ajustes → "Formulario de reserva" (vy A, `falt-A-bokningsformular.html`,
// WP-40 steg 6, D-031): låst rad, branschförslag, hela frågekatalogen och en
// förhandsvisning för en vald tjänst. Mobil först: förhandsvisningen hamnar
// under listan på smala skärmar (ingen `lg:`-brytpunkt döljer den).
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ajustes, formulario } from "@/i18n";

import { AppliesToPanel } from "./applies-to-panel";
import { bookingFormErrorText } from "./booking-form-error-text";
import { industryForBusinessCategory } from "./booking-form-industry";
import { questionsApplyingToService } from "./booking-form-resolve";
import type {
  BookingFormActions,
  BookingFormSettings,
  MutationResult,
  Targets,
} from "./booking-form-types";
import { BookingSuggestionsBanner } from "./booking-suggestions-banner";
import { QuestionEditor, type QuestionEditorInitial } from "./question-editor";
import { QuestionPreview } from "./question-preview";
import { appliesToLabel, QuestionRow } from "./question-row";

export type BookingFormSectionProps = {
  settings: BookingFormSettings;
  businessCategory: string | null;
  actions: BookingFormActions;
  onReload: () => Promise<void>;
};

export function BookingFormSection({
  settings,
  businessCategory,
  actions,
  onReload,
}: BookingFormSectionProps) {
  const activeServices = useMemo(
    () => settings.services.filter((s) => s.active),
    [settings.services],
  );
  const [previewServiceId, setPreviewServiceId] = useState<string | null>(
    activeServices[0]?.id ?? null,
  );
  const [newQuestionOpen, setNewQuestionOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [targetsId, setTargetsId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  const industry = industryForBusinessCategory(businessCategory);

  const previewService =
    settings.services.find((s) => s.id === previewServiceId) ?? null;
  const previewQuestions = previewService
    ? questionsApplyingToService(
        settings.questions,
        previewService,
        settings.maxPerService,
      )
    : [];
  const previewCount = previewQuestions.length;

  async function withReload<T extends { ok: boolean }>(
    run: () => Promise<T>,
  ): Promise<T> {
    const result = await run();
    if (result.ok) await onReload();
    return result;
  }

  async function move(questionId: string, direction: -1 | 1) {
    const ordered = [...settings.questions].sort((a, b) => a.sort - b.sort);
    const index = ordered.findIndex((q) => q.id === questionId);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    const result = await actions.reorderQuestions(next.map((q) => q.id));
    if (result.ok) await onReload();
    else setError(bookingFormErrorText(result.code));
  }

  const editingQuestion =
    settings.questions.find((q) => q.id === editingId) ?? null;
  const targetsQuestion =
    settings.questions.find((q) => q.id === targetsId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <Card radius="tile" padding="lg" className="flex flex-col gap-1">
        <h2 className="text-18 font-bold text-ink">
          {ajustes.secciones.formularioReserva}
        </h2>
      </Card>

      <Card
        radius="tile"
        padding="none"
        className="flex items-center gap-3 px-4.5 py-4"
      >
        <div className="min-w-0 flex-1">
          <p className="text-14 font-bold text-ink">
            {formulario.candado.titulo}
          </p>
          <p className="text-12 text-muted">{formulario.candado.ayuda}</p>
        </div>
        <Chip tone="neutral" size="sm">
          {formulario.candado.etiqueta}
        </Chip>
      </Card>

      {industry ? (
        <BookingSuggestionsBanner
          industry={industry}
          questions={settings.questions}
          onActivate={(presetKey) =>
            withReload(() => actions.activatePreset({ industry, presetKey }))
          }
          onDeactivate={(questionId) =>
            withReload(() => actions.setQuestionActive(questionId, false))
          }
        />
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <Card
          radius="tile"
          padding="lg"
          className="flex min-w-0 flex-1 flex-col gap-1"
        >
          <p className="text-12 font-bold tracking-caps text-muted uppercase">
            {formulario.preguntasContador({
              n: previewCount,
              max: settings.maxPerService,
            })}
          </p>

          <div className="flex flex-col">
            {settings.questions.map((q) => (
              <QuestionRow
                key={q.id}
                question={q}
                categories={settings.categories}
                services={settings.services}
                onToggleActive={(active) =>
                  void withReload(() => actions.setQuestionActive(q.id, active))
                }
                onEdit={() => setEditingId(q.id)}
                onEditTargets={() => setTargetsId(q.id)}
                onMoveUp={() => void move(q.id, -1)}
                onMoveDown={() => void move(q.id, 1)}
                canMoveUp={settings.questions.indexOf(q) > 0}
                canMoveDown={
                  settings.questions.indexOf(q) < settings.questions.length - 1
                }
              />
            ))}
            {settings.questions.length === 0 ? (
              // TODO_COPY: falta un texto para "todavía no hay preguntas" —
              // no hay una clave en `formulario` para esto, ver el reporte
              // del WP-40.
              <p className="py-3 text-13 text-muted">
                Todavía no agregaste preguntas.
              </p>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="text-13 font-semibold text-ink">
              {error}
            </p>
          ) : null}

          {!newQuestionOpen ? (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setNewQuestionOpen(true)}
            >
              {formulario.ctaNuevaPregunta}
            </Button>
          ) : (
            <QuestionEditor
              onCancel={() => setNewQuestionOpen(false)}
              onSubmit={(fields) =>
                withReload(() =>
                  actions.createQuestion({
                    question: fields,
                    targets: { appliesTo: "all" },
                  }),
                )
              }
            />
          )}

          {editingQuestion ? (
            <QuestionEditor
              initial={toEditorInitial(editingQuestion)}
              onCancel={() => setEditingId(null)}
              onSubmit={(fields) =>
                withReload(() =>
                  actions.updateQuestion(editingQuestion.id, fields),
                )
              }
              onDelete={() =>
                withReload(() => actions.deleteQuestion(editingQuestion.id))
              }
            />
          ) : null}

          {targetsQuestion ? (
            <AppliesToPanel
              questionLabel={targetsQuestion.label}
              categories={settings.categories}
              services={settings.services}
              initial={toTargets(targetsQuestion)}
              onCancel={() => setTargetsId(null)}
              onSave={(targets) =>
                withReload<MutationResult>(() =>
                  actions.setQuestionTargets(targetsQuestion.id, targets),
                )
              }
            />
          ) : null}
        </Card>

        <aside
          aria-label={formulario.preview.titulo({
            servicio: previewService?.name ?? "",
          })}
          className="flex flex-col gap-3 lg:w-80 lg:shrink-0"
        >
          {activeServices.length > 1 ? (
            <select
              aria-label={ajustes.secciones.servicios}
              value={previewServiceId ?? ""}
              onChange={(e) => setPreviewServiceId(e.target.value || null)}
              className="h-11 w-full rounded-control border-2 border-transparent bg-surface px-3.5 text-13 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {activeServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : null}
          {previewService ? (
            <QuestionPreview
              serviceName={previewService.name}
              questions={previewQuestions.map((q) => ({
                id: q.id,
                label: q.label,
                help: q.help,
                kind: q.kind,
                options: q.options,
                required: q.required,
                saveToCustomer: q.saveToCustomer,
              }))}
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function toEditorInitial(
  q: BookingFormSettings["questions"][number],
): QuestionEditorInitial {
  return {
    label: q.label,
    help: q.help,
    kind: q.kind,
    options: q.options,
    required: q.required,
    saveToCustomer: q.saveToCustomer,
  };
}

function toTargets(q: BookingFormSettings["questions"][number]): Targets {
  return q.appliesTo === "all"
    ? { appliesTo: "all" }
    : {
        appliesTo: "targets",
        serviceIds: q.serviceIds,
        categoryIds: q.categoryIds,
      };
}

// Re-exporterad för test/återanvändning (samma mönster som `agenda-view.ts`).
export { appliesToLabel };
