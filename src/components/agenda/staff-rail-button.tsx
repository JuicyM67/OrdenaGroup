// Se DESIGN.md §7 "Byggt i WP-12" — knapp per profesional i AgendaRail.
import { cn } from "@/components/ui/cn";
import { agenda } from "@/i18n";

import { staffBgClass } from "./agenda-view";
import type { AgendaStaff } from "./types";

export type StaffRailButtonProps = {
  staff: AgendaStaff;
  /** Ringmarkeringen (FRÅGA 5): senast visade profesional i dagvyn, standard den första. */
  selected: boolean;
  onSelect: () => void;
};

export function StaffRailButton({
  staff,
  selected,
  onSelect,
}: StaffRailButtonProps) {
  return (
    <button
      type="button"
      aria-label={agenda.verAgendaDe({ nombre: staff.name })}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex size-14 shrink-0 items-center justify-center rounded-full border-3 border-dark text-15 font-bold text-ink transition-colors duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none on-dark:focus-visible:outline-lime",
        staffBgClass(staff.color),
        selected && "ring-2 ring-lime",
      )}
    >
      {staff.initials ?? staff.name.slice(0, 2).toUpperCase()}
    </button>
  );
}
