// StaffPicker — Reserva.dc.html rad 51–58 (R8 av WP-02: Pill + "Cualquiera").
// Radbryts i stället för att scrolla i sidled (sidledsscrollen gjorde mobilsidan bredare än skärmen).
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
    <div className="flex flex-wrap gap-2">
      <Pill
        selected={selectedId === "any"}
        onClick={() => {
          onSelect("any");
        }}
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
        >
          {p.name}
        </Pill>
      ))}
    </div>
  );
}
