// WP-42: mobilens "växlare" för dagvyn (en profesional åt gången, DayGrid får bara den
// personen i `visibleStaff` — se agenda-screen.tsx). Samma Pill-mönster/scroll som
// `booking/staff-picker.tsx` ("-mx-5 px-5 overflow-x-auto snap-x", DESIGN.md).
import { Pill } from "@/components/ui/pill";

import type { AgendaStaff, StaffId } from "./types";

export type StaffSwitcherProps = {
  staff: readonly AgendaStaff[];
  selectedId: StaffId | null;
  onSelect: (staffId: StaffId) => void;
};

export function StaffSwitcher({
  staff,
  selectedId,
  onSelect,
}: StaffSwitcherProps) {
  return (
    <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4">
      {staff.map((s) => (
        <Pill
          key={s.id}
          selected={selectedId === s.id}
          onClick={() => onSelect(s.id)}
          className="snap-start"
        >
          {s.name}
        </Pill>
      ))}
    </div>
  );
}
