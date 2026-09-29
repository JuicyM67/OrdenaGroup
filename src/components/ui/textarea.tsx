// Textarea — samma formspråk som TextField (text-field.tsx: vita fält
// `rounded-control`, 2 px-kant, fältfel med AlertCircle). Ingen egen
// referens i *.dc.html (härledd som TextField, WP-13 R1); används första
// gången av de dynamiska bokningsfrågorna (WP-40, `question-field.tsx`,
// typen `long_text`).
import { AlertCircle } from "lucide-react";
import type { ComponentPropsWithoutRef, Ref } from "react";
import { useId } from "react";

import { cn } from "./cn";

export type TextareaProps = Omit<
  ComponentPropsWithoutRef<"textarea">,
  "id" | "className"
> & {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  ref?: Ref<HTMLTextAreaElement>;
  className?: string;
  textareaClassName?: string;
};

export function Textarea({
  id,
  label,
  hint,
  error,
  required,
  ref,
  className,
  textareaClassName,
  rows = 3,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-13 font-semibold text-ink">
        {label}
      </label>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        aria-required={required}
        required={required}
        className={cn(
          "w-full scroll-mb-28 resize-y rounded-control border-2 border-transparent bg-surface px-4 py-3 text-15 font-medium text-ink transition-colors duration-150 ease-out placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none",
          error && "border-alert",
          textareaClassName,
        )}
        {...props}
      />
      {hint ? (
        <span id={hintId} className="text-13 text-muted">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span
          id={errorId}
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
