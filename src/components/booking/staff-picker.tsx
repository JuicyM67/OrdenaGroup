// StaffPicker — Reserva.dc.html rad 51–58 (R8 av WP-02: Pill + "Cualquiera").
// Full bredd, scrollar horisontellt i stället för att bryta rad (planens steg 2).
import { Pill } from "@/components/ui/pill";
import { reserva } from "@/i18n";

import type { BookingStaffMember } from "./types";

export function StaffPicker({
  staff,
  selectedId,
  onSelect,
}: {
  staff: readonly BookingStaffMember[];
  selectedId: string;
  onSelect: (staffId: string) => void;
}) {
  return (
    <div className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5">
      <Pill
        selected={selectedId === "any"}
        onClick={() => {
          onSelect("any");
        }}
        className="snap-start"
      >
        {reserva.pasos.cualquiera}
      </Pill>
      {staff.map((p) => (
        <Pill
          key={p.id}
          selected={selectedId === p.id}
          onClick={() => {
            onSelect(p.id);
          }}
          className="snap-start"
        >
          {p.name}
        </Pill>
      ))}
    </div>
  );
}
