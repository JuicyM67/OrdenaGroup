"use client";

// Ajustes → "Formulario de reserva" (vy A, `falt-A-bokningsformular.html`,
// WP-40 steg 6, D-031): låst rad, branschförslag, hela frågekatalogen och en
// förhandsvisning för en vald tjänst. Mobil först: förhandsvisningen hamnar
// under listan på smala skärmar (ingen `lg:`-brytpunkt döljer den).
//
// WP-62 (ägarens feedback 2026-10-02, D-042, skärm ~2000 px): frågeeditorn
// expanderade tidigare inline under listan, med "Gäller för" som ett eget
// inbäddat kort med egen spara-knapp under den — två spara-knappar staplat på
// höjden. Nu: lista till vänster, redigeraren till höger (`lg:sticky`) i en
// egen kolumn i stället för att växa listans höjd; "Gäller för" är inbäddat i
// `QuestionEditor` (en "Spara fråga"-knapp, se dess filkommentar). Klicket på
// "Gäller för"-chippen i `QuestionRow` öppnar nu samma redigerare i stället
// för en separat panel. Mobil (< lg): oförändrad stapling, redigeraren hamnar
// efter hela listan i stället för mitt i den (samma DOM-nod kan inte stå på
// två ställen samtidigt utan att dubblera formuläret, se rapporten).
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ajustes, formulario } from "@/i18n";

import { bookingFormErrorText } from "./booking-form-error-text";
import { industryForBusinessCategory } from "./booking-form-industry";
import { questionsApplyingToService } from "./booking-form-resolve";
import type {
  BookingFormActions,
  BookingFormSettings,
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
  const detailOpen = newQuestionOpen || editingQuestion !== null;

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

      {/* WP-62/D-042: lista till vänster, redigeraren till höger i en sticky kolumn (lg+) i
          stället för att expandera listans höjd — se filkommentaren. Under lg: oförändrad
          stapling (redigeraren hamnar efter hela listan). */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-list-editor lg:items-start">
        <Card
          radius="tile"
          padding="lg"
          className="flex min-w-0 flex-col gap-1"
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
                onEditTargets={() => setEditingId(q.id)}
                onMoveUp={() => void move(q.id, -1)}
                onMoveDown={() => void move(q.id, 1)}
                canMoveUp={settings.questions.indexOf(q) > 0}
                canMoveDown={
                  settings.questions.indexOf(q) < settings.questions.length - 1
                }
              />
            ))}
            {settings.questions.length === 0 ? (
              <p className="py-3 text-13 text-muted">
                {formulario.sinPreguntas}
              </p>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="text-13 font-semibold text-ink">
              {error}
            </p>
          ) : null}

          {!detailOpen ? (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setNewQuestionOpen(true)}
            >
              {formulario.ctaNuevaPregunta}
            </Button>
          ) : null}
        </Card>

        <div className="flex flex-col gap-3 lg:sticky lg:top-0">
          {newQuestionOpen ? (
            <QuestionEditor
              onCancel={() => setNewQuestionOpen(false)}
              onSubmit={(fields) =>
                actions.createQuestion({
                  question: fields,
                  targets: { appliesTo: "all" },
                })
              }
              targets={{
                categories: settings.categories,
                services: settings.services,
                initial: { appliesTo: "all" },
              }}
              onSaveTargets={(id, targets) =>
                actions.setQuestionTargets(id, targets)
              }
              onSaved={onReload}
            />
          ) : editingQuestion ? (
            <QuestionEditor
              key={editingQuestion.id}
              initial={toEditorInitial(editingQuestion)}
              questionId={editingQuestion.id}
              onCancel={() => setEditingId(null)}
              onSubmit={(fields) =>
                actions.updateQuestion(editingQuestion.id, fields)
              }
              onDelete={() =>
                withReload(() => actions.deleteQuestion(editingQuestion.id))
              }
              targets={{
                categories: settings.categories,
                services: settings.services,
                initial: toTargets(editingQuestion),
              }}
              onSaveTargets={(id, targets) =>
                actions.setQuestionTargets(id, targets)
              }
              onSaved={onReload}
            />
          ) : (
            <aside
              aria-label={formulario.preview.titulo({
                servicio: previewService?.name ?? "",
              })}
              className="flex flex-col gap-3"
            >
              {activeServices.length > 1 ? (
                <select
                  aria-label={ajustes.secciones.servicios}
                  value={previewServiceId ?? ""}
                  onChange={(e) => setPreviewServiceId(e.target.value || null)}
                  className="h-11 w-full rounded-control border-2 border-transparent bg-field px-3.5 text-13 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
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
          )}
        </div>
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
