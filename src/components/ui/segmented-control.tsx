"use client";

// Se DESIGN.md §7. Radix ToggleGroup type="single", kontrollerad, värdet kan aldrig bli tomt.
// R10: Radix exponerar knapparna som role="radio"/aria-checked i stället för aria-pressed —
// semantiskt likvärdigt (ett val av flera) och godkänt av axe, se DESIGN.md §9.
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import type { ReactNode } from "react";

import { cn } from "./cn";

export type SegmentedControlOption = {
  value: string;
  label: ReactNode;
  /** Radix hoppar över alternativet i piltangentsnavigeringen (WP-12: "Mes"). */
  disabled?: boolean;
};

export type SegmentedControlProps = {
  "aria-label": string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SegmentedControlOption[];
  className?: string;
  /** WP-60 fynd: cada opción mide `w-24` (96px) por defecto — con 4
   * opciones (p. ej. Caja: Hoy/Semana/Mes/Rango) el control no cabe en
   * 390 px y causaba scroll horizontal. Los llamadores con más de 3
   * opciones pueden angostar cada ítem acá (p. ej. "w-20"). */
  itemClassName?: string;
};

export function SegmentedControl({
  "aria-label": ariaLabel,
  value,
  onValueChange,
  options,
  className,
  itemClassName,
}: SegmentedControlProps) {
  return (
    <ToggleGroup.Root
      type="single"
      aria-label={ariaLabel}
      value={value}
      onValueChange={(next) => {
        // Ett tomt värde betyder att användaren klickade på det redan valda alternativet —
        // ignorera det i stället för att låta värdet bli tomt.
        if (next) onValueChange(next);
      }}
      className={cn("flex gap-1 rounded-control bg-surface/45 p-1", className)}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className={cn(
            "h-9 w-24 rounded-event text-13 font-semibold text-ink transition-colors duration-150 ease-out",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none on-dark:focus-visible:outline-lime",
            "toggle-on:bg-surface toggle-on:font-bold",
            "disabled:pointer-events-none disabled:opacity-40",
            itemClassName,
          )}
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
