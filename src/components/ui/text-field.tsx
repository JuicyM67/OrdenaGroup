// Textfält för formulär (Reserva/datasteget, WP-13, R1/FRÅGA 2–3 i planen). Ingen
// referens i *.dc.html: formspråket är härlett (vita fält h 52 `rounded-control`,
// samma 2 px-kant som ServiceCard) och godkänt av ägaren via skärmdumpar (PR E).
import { AlertCircle } from "lucide-react";
import type { ComponentPropsWithoutRef, Ref } from "react";
import { useId } from "react";

import { cn } from "./cn";

export type TextFieldProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "id" | "className"
> & {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  ref?: Ref<HTMLInputElement>;
  className?: string;
  inputClassName?: string;
};

export function TextField({
  id,
  label,
  hint,
  error,
  required,
  ref,
  className,
  inputClassName,
  ...props
}: TextFieldProps) {
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
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        aria-required={required}
        required={required}
        className={cn(
          "h-13 w-full scroll-mb-28 rounded-control border-2 border-transparent bg-surface px-4 text-15 font-medium text-ink transition-colors duration-150 ease-out placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none",
          error && "border-alert",
          inputClassName,
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
