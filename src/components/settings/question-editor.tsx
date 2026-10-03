"use client";

// Redigeraren "Ny fråga"/"Pregunta propia" (`falt-A`, `falt-B`, WP-40 steg
// 5–7, D-031): delad mellan vy A och vy B. Typen väljs i en `<select>`
// (samma fält som `falt-B` redan ritar) i stället för den svävande
// typ-panelen i `falt-A` — en select är mer tillgänglig och räcker för sju
// alternativ (se rapporten för motiveringen).
//
// WP-62 (ägarens feedback 2026-10-02, D-042): "Gäller för" (`targets`, frivillig)
// renderas nu som en vanlig del av samma formulär i stället för ett eget
// inbäddat kort med egen spara-knapp — `handleSubmit` sparar frågans fält OCH
// (om `targets`/`onSaveTargets` finns) vilka tjänster den gäller, i följd,
// bakom EN "Spara fråga"-knapp. Servern har kvar två separata actions
// (`updateQuestion`/`createQuestion` respektive `setQuestionTargets`) — ingen
// databasändring, bara två anrop efter varandra härifrån (se rapporten).
import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { ajustes, formulario } from "@/i18n";

import { AppliesToFields, useAppliesToState } from "./applies-to-panel";
import { bookingFormErrorText } from "./booking-form-error-text";
import {
  isChoiceKind,
  QUESTION_KINDS,
  type BookingFormCategory,
  type BookingFormService,
  type CreateResult,
  type MutationResult,
  type QuestionFieldsInput,
  type QuestionKind,
  type Targets,
} from "./booking-form-types";

export type QuestionEditorInitial = {
  label: string;
  help: string | null;
  kind: QuestionKind;
  options: readonly string[] | null;
  required: boolean;
  saveToCustomer: boolean;
};

const EMPTY: QuestionEditorInitial = {
  label: "",
  help: null,
  kind: "short_text",
  options: null,
  required: false,
  saveToCustomer: false,
};

/** "Gäller för" inbäddat i formuläret (vy A, D-042) i stället för en egen
 * panel: `questionId` saknas vid skapande (`onSaveTargets` får då `id` från
 * `onSubmit`s `CreateResult`). */
export type QuestionEditorTargets = {
  categories: BookingFormCategory[];
  services: BookingFormService[];
  initial: Targets;
};

export type QuestionEditorProps = {
  initial?: QuestionEditorInitial;
  /** Frågans id, bara känt vid redigering (skapande får sitt id från
   * `onSubmit`s `CreateResult`, se `handleSubmit`). */
  questionId?: string;
  onCancel: () => void;
  onSubmit: (
    fields: QuestionFieldsInput,
  ) => Promise<MutationResult | CreateResult>;
  onDelete?: () => Promise<MutationResult>;
  /** "Gäller för", inbäddat (D-042): bara vy A skickar den här. */
  targets?: QuestionEditorTargets;
  onSaveTargets?: (id: string, targets: Targets) => Promise<MutationResult>;
  /** Körs efter en lyckad `onSubmit` (+ `onSaveTargets` om den finns) — vy A
   * laddar om listan en enda gång i stället för en gång per anrop. */
  onSaved?: () => Promise<void>;
  /** Rad extra: t.ex. "Använd frågan även i andra tjänster" (vy B). */
  footer?: ReactNode;
  className?: string;
};

export function QuestionEditor({
  initial,
  questionId,
  onCancel,
  onSubmit,
  onDelete,
  targets,
  onSaveTargets,
  onSaved,
  footer,
  className,
}: QuestionEditorProps) {
  const targetsState = useAppliesToState(
    targets?.categories ?? [],
    targets?.services ?? [],
    targets?.initial ?? { appliesTo: "all" },
  );
  const [label, setLabel] = useState(initial?.label ?? EMPTY.label);
  const [help, setHelp] = useState(initial?.help ?? "");
  const [kind, setKind] = useState<QuestionKind>(initial?.kind ?? EMPTY.kind);
  const [options, setOptions] = useState<string[]>(
    initial?.options ? [...initial.options] : [],
  );
  const [newOption, setNewOption] = useState("");
  const [required, setRequired] = useState(initial?.required ?? EMPTY.required);
  const [saveToCustomer, setSaveToCustomer] = useState(
    initial?.saveToCustomer ?? EMPTY.saveToCustomer,
  );
  const [labelError, setLabelError] = useState<string | undefined>();
  const [optionsError, setOptionsError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const optionInputId = useId();

  function addOption() {
    const v = newOption.trim();
    if (!v) return;
    if (options.includes(v)) {
      setOptionsError(formulario.errores.respuesta.duplicate_option);
      return;
    }
    setOptions((prev) => [...prev, v]);
    setNewOption("");
    setOptionsError(undefined);
  }

  function removeOption(v: string) {
    setOptions((prev) => prev.filter((o) => o !== v));
  }

  async function handleSubmit() {
    const trimmed = label.trim();
    if (!trimmed) {
      setLabelError(formulario.errores.respuesta.required);
      return;
    }
    setLabelError(undefined);
    if (isChoiceKind(kind) && options.length === 0) {
      setOptionsError(formulario.errores.respuesta.empty_selection);
      return;
    }
    setOptionsError(undefined);
    setSubmitError(undefined);
    setSaving(true);
    try {
      const fields: QuestionFieldsInput = {
        label: trimmed,
        help: help.trim() === "" ? null : help.trim(),
        kind,
        options: isChoiceKind(kind) ? options : null,
        required,
        saveToCustomer,
      };
      const result = await onSubmit(fields);
      if (!result.ok) {
        setSubmitError(bookingFormErrorText(result.code));
        return;
      }
      const id = questionId ?? ("id" in result ? result.id : undefined);
      if (targets && onSaveTargets && id) {
        const targetsResult = await onSaveTargets(
          id,
          targetsState.computeTargets(),
        );
        if (!targetsResult.ok) {
          setSubmitError(bookingFormErrorText(targetsResult.code));
          return;
        }
      }
      if (onSaved) await onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      const result = await onDelete();
      if (!result.ok) setSubmitError(bookingFormErrorText(result.code));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card
      radius="tile"
      padding="lg"
      className={className ? className : "flex flex-col gap-3"}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-16 font-bold text-ink">
          {formulario.editor.tituloNueva}
        </h3>
        <span className="text-12 text-muted">
          {formulario.editor.etiquetaPropia}
        </span>
      </div>

      <TextField
        label={formulario.editor.preguntaLabel}
        placeholder={formulario.editor.preguntaPlaceholder}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        error={labelError}
        maxLength={200}
        autoFocus
      />

      <TextField
        label={formulario.editor.ayudaLabel}
        value={help}
        onChange={(e) => setHelp(e.target.value)}
        maxLength={300}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label={formulario.editor.tipoLabel}
          value={kind}
          onChange={(e) => setKind(e.target.value as QuestionKind)}
        >
          {QUESTION_KINDS.map((k) => (
            <option key={k} value={k}>
              {formulario.tipos[k]}
            </option>
          ))}
        </Select>

        <div className="flex flex-col gap-1.5">
          <span className="text-13 font-semibold text-ink">
            {formulario.editor.obligatoriaLabel}
          </span>
          <div className="flex h-13 items-center gap-2">
            <Switch
              checked={required}
              onChange={setRequired}
              label={formulario.editor.obligatoriaLabel}
            />
            <span className="text-14 font-medium text-muted">
              {required ? formulario.siNo.si : formulario.siNo.no}
            </span>
          </div>
        </div>
      </div>

      {isChoiceKind(kind) ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-13 font-semibold text-ink">
            {formulario.editor.alternativosLabel}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => removeOption(o)}
                className="rounded-full bg-lavender px-2.5 py-1.5 text-12 font-semibold text-on-lilac-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {o} ✕
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              id={optionInputId}
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOption();
                }
              }}
              maxLength={80}
              aria-label={formulario.editor.alternativosLabel}
              className="h-11 flex-1 rounded-control border-2 border-transparent bg-canvas px-3.5 text-13 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addOption}
            >
              {formulario.editor.ctaAgregarAlternativa}
            </Button>
          </div>
          {optionsError ? (
            <span className="text-13 font-semibold text-ink">
              {optionsError}
            </span>
          ) : null}
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-13 text-muted">
        <Switch
          checked={saveToCustomer}
          onChange={setSaveToCustomer}
          label={formulario.guardaEnFicha}
        />
        {formulario.guardaEnFicha}
      </label>

      {targets ? (
        <div className="flex flex-col gap-2 border-t border-line-strong pt-3">
          <span className="text-13 font-semibold text-ink">
            {formulario.aplicaA.titulo}
          </span>
          <AppliesToFields state={targetsState} />
        </div>
      ) : null}

      {footer}

      <p className="rounded-event bg-peach-50 px-2.5 py-2 text-12 text-on-peach-soft">
        {formulario.avisoDatosSensibles}
      </p>

      {submitError ? (
        <p role="alert" className="text-13 font-semibold text-ink">
          {submitError}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        {onDelete ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={deleting}
            onClick={() => void handleDelete()}
          >
            {formulario.editor.ctaEliminar}
          </Button>
        ) : null}
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          {ajustes.seguirEditando}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={() => void handleSubmit()}
        >
          {saving ? ajustes.guardando : formulario.editor.ctaGuardar}
        </Button>
      </div>
    </Card>
  );
}
