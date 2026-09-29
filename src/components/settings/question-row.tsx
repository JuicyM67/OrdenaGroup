"use client";

// En rad i frågelistan (`falt-A-bokningsformular.html`, WP-40 steg 6, D-031):
// delad mellan vy A (hela katalogen) och vy B (filtrerad på en tjänst).
// Ordning ändras med upp/ner-knappar (`servicios.campos.subirAria`/
// `bajarAria`) i stället för drag: tillgängligt med tangentbord utan extra
// beroende, se rapporten.
import { ChevronDown, ChevronUp } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { IconButton } from "@/components/ui/icon-button";
import { Switch } from "@/components/ui/switch";
import { formulario, servicios } from "@/i18n";

import type {
  BookingFormCategory,
  BookingFormQuestion,
  BookingFormService,
} from "./booking-form-types";

function questionMeta(q: BookingFormQuestion): string {
  const kindLabel = formulario.tipos[q.kind];
  if (q.kind === "single_choice" || q.kind === "multi_choice") {
    return `${kindLabel} · ${(q.options ?? []).join(", ")}`;
  }
  if (q.presetKey === null) {
    return `${kindLabel} · ${formulario.editor.etiquetaPropia}`;
  }
  return kindLabel;
}

export function appliesToLabel(
  q: Pick<BookingFormQuestion, "appliesTo" | "serviceIds" | "categoryIds">,
  categories: BookingFormCategory[],
  services: BookingFormService[],
): string {
  if (q.appliesTo === "all") return formulario.todosLosServicios;
  const names = [
    ...categories
      .filter((c) => q.categoryIds.includes(c.id))
      .map((c) => c.name),
    ...services.filter((s) => q.serviceIds.includes(s.id)).map((s) => s.name),
  ];
  return names.length > 0 ? names.join(", ") : formulario.todosLosServicios;
}

export type QuestionRowProps = {
  question: BookingFormQuestion;
  categories: BookingFormCategory[];
  services: BookingFormService[];
  onToggleActive: (active: boolean) => void;
  onEdit: () => void;
  onEditTargets: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
};

export function QuestionRow({
  question,
  categories,
  services,
  onToggleActive,
  onEdit,
  onEditTargets,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: QuestionRowProps) {
  return (
    <div className="flex items-center gap-3 border-b border-line-strong py-3 last:border-b-0">
      {onMoveUp || onMoveDown ? (
        <div className="flex shrink-0 flex-col gap-0.5">
          <IconButton
            label={servicios.campos.subirAria}
            tone="ghost"
            size={30}
            disabled={!canMoveUp}
            onClick={onMoveUp}
          >
            <ChevronUp aria-hidden="true" className="size-4" strokeWidth={2} />
          </IconButton>
          <IconButton
            label={servicios.campos.bajarAria}
            tone="ghost"
            size={30}
            disabled={!canMoveDown}
            onClick={onMoveDown}
          >
            <ChevronDown
              aria-hidden="true"
              className="size-4"
              strokeWidth={2}
            />
          </IconButton>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <p className="truncate text-14 font-bold text-ink">{question.label}</p>
        <p className="truncate text-12 text-muted">{questionMeta(question)}</p>
      </button>

      <button
        type="button"
        onClick={onEditTargets}
        className="hidden shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:inline-flex"
      >
        <Chip tone="lavender" size="sm">
          {appliesToLabel(question, categories, services)}
        </Chip>
      </button>

      <Chip
        tone={question.required ? "ink" : "neutral"}
        size="sm"
        weight={question.required ? "bold" : "default"}
        className="hidden shrink-0 md:inline-flex"
      >
        {question.required ? formulario.obligatoria : formulario.opcional}
      </Chip>

      {question.saveToCustomer ? (
        <Chip tone="peach" size="sm" className="hidden shrink-0 lg:inline-flex">
          {formulario.guardaEnFicha}
        </Chip>
      ) : null}

      <Switch
        checked={question.active}
        onChange={onToggleActive}
        label={question.label}
        className="shrink-0"
      />
    </div>
  );
}
