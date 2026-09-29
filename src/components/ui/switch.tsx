// På/av-växel (DESIGN.md §7, ny i WP-40: `falt-A-bokningsformular.html`,
// `falt-B-per-tjanst.html` — frågans aktiv-läge och "Obligatorisk"). 40×24,
// rundad, knapp 18 px. Storlek och position på själva klickytan (knappen)
// ändras aldrig — bara den inre knoppen flyttas, samma mönster som en
// vanlig checkbox-ersättning.
import { cn } from "./cn";

export type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Obligatorisk: blir aria-label. */
  label: string;
  disabled?: boolean;
  className?: string;
};

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-40",
        checked ? "bg-ink" : "bg-border",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0.75 block size-4.5 rounded-full transition-transform duration-150 ease-out",
          checked ? "translate-x-4 bg-lime" : "translate-x-0 bg-surface",
        )}
      />
    </button>
  );
}
