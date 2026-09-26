// Valbar knapp (Reserva: tjänst-/personal-/dagval), se DESIGN.md §7. Färgen animeras,
// storleken aldrig (hård regel "animera aldrig storlek eller position på klickytor").
import type { ComponentPropsWithoutRef, Ref } from "react";

import { cn } from "./cn";

export type PillProps = Omit<ComponentPropsWithoutRef<"button">, "type"> & {
  type?: "button" | "submit" | "reset";
  selected: boolean;
  ref?: Ref<HTMLButtonElement>;
};

export function Pill({
  className,
  selected,
  type = "button",
  ref,
  ...props
}: PillProps) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      className={cn(
        "h-11 shrink-0 rounded-full px-4 text-14 font-semibold transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none on-dark:focus-visible:outline-lime",
        selected ? "bg-ink text-on-dark" : "bg-surface text-ink",
        className,
      )}
      {...props}
    />
  );
}
