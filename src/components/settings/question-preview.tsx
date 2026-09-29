"use client";

// Förhandsvisning "Så ser kunden det · {servicio}" (`falt-A`, `falt-kategorier.html`,
// WP-40 steg 6, D-031). Enkel, egen förhandsvisning — återanvänder INTE
// kundformulärets renderare (den byggs samtidigt av en annan ui-engineer,
// se uppdraget): bara ett fönster i en telefonram med icke-interaktiva fält
// för de frågor som gäller den valda tjänsten. `reserva.clienteForm.*`/
// `reserva.antesDeConfirmar.ctaConfirmar` är samma copy som kundens riktiga
// formulär (ingen ny text här). Fälten här är medvetet egna, kompakta
// `<input>`/`<textarea>` och inte `TextField`/`Textarea`/`Select`
// (`src/components/ui/`): de komponenterna är minst 52 px höga för en
// riktig sida, för stora för en 300 px bred telefonram med flera fält i
// bild — samma avvägning som referensernas egna, skalade telefonmockupper.
import { formulario, reserva } from "@/i18n";

import type { BookingQuestionPreviewDef } from "./booking-form-types";

function PreviewField({ q }: { q: BookingQuestionPreviewDef }) {
  const label = q.label + (q.required ? " *" : "");
  switch (q.kind) {
    case "short_text":
    case "number":
    case "date":
      return (
        <label className="flex flex-col gap-1 text-12 font-semibold text-ink">
          {label}
          <input
            disabled
            type={
              q.kind === "number"
                ? "number"
                : q.kind === "date"
                  ? "date"
                  : "text"
            }
            className="w-full rounded-control border border-border bg-surface px-2.5 py-2 text-13 font-medium text-ink disabled:opacity-100"
          />
        </label>
      );
    case "long_text":
      return (
        <label className="flex flex-col gap-1 text-12 font-semibold text-ink">
          {label}
          <textarea
            disabled
            className="h-14 w-full resize-none rounded-control border border-border bg-surface px-2.5 py-2 text-13 font-medium text-ink disabled:opacity-100"
          />
        </label>
      );
    case "yes_no":
      return (
        <div className="flex flex-col gap-1.5 text-12 font-semibold text-ink">
          {label}
          <div className="flex gap-1.5">
            <span className="rounded-full bg-ink px-3 py-1.5 text-12 font-bold text-on-dark">
              {formulario.siNo.si}
            </span>
            <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-12 text-ink">
              {formulario.siNo.no}
            </span>
          </div>
        </div>
      );
    case "single_choice":
    case "multi_choice":
      return (
        <div className="flex flex-col gap-1.5 text-12 font-semibold text-ink">
          {label}
          <div className="flex flex-wrap gap-1.5">
            {(q.options ?? []).map((o, i) => (
              <span
                key={o}
                className={
                  i === 0
                    ? "rounded-full bg-ink px-3 py-1.5 text-12 font-bold text-on-dark"
                    : "rounded-full border border-border bg-surface px-3 py-1.5 text-12 text-ink"
                }
              >
                {o}
              </span>
            ))}
          </div>
        </div>
      );
  }
}

export type QuestionPreviewProps = {
  serviceName: string;
  questions: BookingQuestionPreviewDef[];
};

export function QuestionPreview({
  serviceName,
  questions,
}: QuestionPreviewProps) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <p className="self-start text-12 font-bold text-muted">
        {formulario.preview.titulo({ servicio: serviceName })}
      </p>
      <div className="w-75 flex-1 rounded-shell bg-ink p-2.5">
        <div className="flex h-full flex-col gap-2.5 rounded-tile bg-canvas p-4">
          <p className="font-display text-22 font-semibold text-ink">
            {reserva.clienteForm.titulo}
          </p>
          <label className="text-12 font-semibold text-ink">
            {reserva.clienteForm.nombreLabel}
            <input
              disabled
              placeholder={reserva.clienteForm.nombrePlaceholder}
              className="mt-1 block w-full rounded-control border border-border bg-surface px-2.5 py-2 text-13 font-medium disabled:opacity-100"
            />
          </label>
          <label className="text-12 font-semibold text-ink">
            {reserva.clienteForm.telefonoLabel}
            <input
              disabled
              placeholder={reserva.clienteForm.telefonoPlaceholder}
              className="mt-1 block w-full rounded-control border border-border bg-surface px-2.5 py-2 text-13 font-medium disabled:opacity-100"
            />
          </label>
          <div className="h-px bg-border" />
          {questions.map((q) => (
            <PreviewField key={q.id} q={q} />
          ))}
          <button
            type="button"
            disabled
            className="mt-auto rounded-icon bg-ink px-4 py-3 text-14 font-bold text-on-dark disabled:opacity-100"
          >
            {reserva.antesDeConfirmar.ctaConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
