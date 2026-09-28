// Nativ <select>, samma tokens och API-form som TextField (label/hint/error). Ingen
// referens i *.dc.html ännu — mönstret är hämtat direkt från `slot-interval` i
// `src/components/settings/business-section.tsx` (WP-15b), bara med label/error som
// TextField. Byggd för dialogerna i WP-21b (Nueva reserva/Mover, `src/components/agenda/`).
import { AlertCircle } from "lucide-react";
import type { ComponentPropsWithoutRef, Ref } from "react";
import { useId } from "react";

import { cn } from "./cn";

export type SelectProps = Omit<
  ComponentPropsWithoutRef<"select">,
  "id" | "className"
> & {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  ref?: Ref<HTMLSelectElement>;
  className?: string;
};

export function Select({
  id,
  label,
  hint,
  error,
  required,
  ref,
  className,
  children,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={selectId} className="text-13 font-semibold text-ink">
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        aria-required={required}
        required={required}
        className={cn(
          "h-13 w-full rounded-control border-2 border-transparent bg-surface px-4 text-15 font-medium text-ink transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none",
          error && "border-alert",
        )}
        {...props}
      >
        {children}
      </select>
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
