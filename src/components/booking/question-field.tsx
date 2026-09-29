// QuestionField — renderare per frågetyp för de dynamiska bokningsfrågorna
// (WP-40, D-031). Se `.visual-diff/ref/falt-A-bokningsformular.html`
// (telefonmockupen: textfält, Pill-val för "Hårlängd"/ja-nej) —
// formspråket återanvänder redan godkända komponenter (TextField, Textarea,
// Pill) i stället för att kopiera mockupens mindre chip-storlek, se
// `category-tabs.tsx` för samma avvägning.
"use client";

import { AlertCircle } from "lucide-react";
import type { ReactNode, Ref } from "react";

import { Pill } from "@/components/ui/pill";
import { TextField } from "@/components/ui/text-field";
import { Textarea } from "@/components/ui/textarea";
import { formulario } from "@/i18n";
import {
  ANSWER_LIMITS,
  type BookingQuestionDef,
} from "@/lib/validation/booking-questions";

/** Det lokala, ovaliderade formulärvärdet för en fråga — innan
 * `validateAnswers` (klientsäker, se `customer-form.tsx`). */
export type QuestionAnswerValue =
  string | readonly string[] | boolean | undefined;

function questionLabel(question: BookingQuestionDef): string {
  return question.required ? `${question.label} *` : question.label;
}

function ChoiceField({
  question,
  error,
  children,
}: {
  question: BookingQuestionDef;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-13 font-semibold text-ink">
        {questionLabel(question)}
      </span>
      {question.help ? (
        <span className="text-13 text-muted">{question.help}</span>
      ) : null}
      <div
        role="group"
        aria-label={questionLabel(question)}
        className="flex flex-wrap gap-2"
      >
        {children}
      </div>
      {error ? (
        <span
          role="alert"
          className="flex items-center gap-1.5 text-13 text-ink"
        >
          <AlertCircle
            aria-hidden="true"
            className="size-4 shrink-0 text-alert"
            strokeWidth={2}
          />
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function QuestionField({
  question,
  value,
  onChange,
  error,
  registerRef,
}: {
  question: BookingQuestionDef;
  value: QuestionAnswerValue;
  onChange: (value: QuestionAnswerValue) => void;
  error?: string;
  /** Fokuseras vid ett fältfel (`answerRefs` i `customer-form.tsx`), samma
   * mönster som `nameRef`/`phoneRef` — men generiskt för alla frågetyper. */
  registerRef: (el: HTMLElement | null) => void;
}) {
  switch (question.kind) {
    case "short_text":
      return (
        <TextField
          ref={registerRef as Ref<HTMLInputElement>}
          label={questionLabel(question)}
          hint={question.help ?? undefined}
          required={question.required}
          maxLength={ANSWER_LIMITS.shortText}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          error={error}
        />
      );
    case "long_text":
      return (
        <Textarea
          ref={registerRef as Ref<HTMLTextAreaElement>}
          label={questionLabel(question)}
          hint={question.help ?? undefined}
          required={question.required}
          maxLength={ANSWER_LIMITS.longText}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          error={error}
        />
      );
    case "number":
      return (
        <TextField
          ref={registerRef as Ref<HTMLInputElement>}
          label={questionLabel(question)}
          hint={question.help ?? undefined}
          required={question.required}
          type="text"
          inputMode="numeric"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => {
            onChange(e.target.value.replaceAll(/\D/g, ""));
          }}
          error={error}
        />
      );
    case "date":
      return (
        <TextField
          ref={registerRef as Ref<HTMLInputElement>}
          label={questionLabel(question)}
          hint={question.help ?? undefined}
          required={question.required}
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          error={error}
        />
      );
    case "yes_no":
      return (
        <ChoiceField question={question} error={error}>
          <Pill
            ref={registerRef as Ref<HTMLButtonElement>}
            selected={value === true}
            onClick={() => {
              onChange(true);
            }}
          >
            {formulario.siNo.si}
          </Pill>
          <Pill
            selected={value === false}
            onClick={() => {
              onChange(false);
            }}
          >
            {formulario.siNo.no}
          </Pill>
        </ChoiceField>
      );
    case "single_choice": {
      const options = question.options ?? [];
      return (
        <ChoiceField question={question} error={error}>
          {options.map((opt, i) => (
            <Pill
              key={opt}
              ref={
                i === 0 ? (registerRef as Ref<HTMLButtonElement>) : undefined
              }
              selected={value === opt}
              onClick={() => {
                onChange(opt);
              }}
            >
              {opt}
            </Pill>
          ))}
        </ChoiceField>
      );
    }
    case "multi_choice": {
      const options = question.options ?? [];
      const selected = Array.isArray(value) ? value : [];
      return (
        <ChoiceField question={question} error={error}>
          {options.map((opt, i) => {
            const isSelected = selected.includes(opt);
            return (
              <Pill
                key={opt}
                ref={
                  i === 0 ? (registerRef as Ref<HTMLButtonElement>) : undefined
                }
                selected={isSelected}
                onClick={() => {
                  onChange(
                    isSelected
                      ? selected.filter((v) => v !== opt)
                      : [...selected, opt],
                  );
                }}
              >
                {opt}
              </Pill>
            );
          })}
        </ChoiceField>
      );
    }
  }
}
