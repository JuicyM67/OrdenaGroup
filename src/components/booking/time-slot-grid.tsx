// TimeSlotGrid — Reserva.dc.html rad 86–95.
import { TimeSlot } from "./time-slot";
import type { BookingSlot } from "./types";

export function TimeSlotGrid({
  slots,
  selectedSlotId,
  onSelect,
}: {
  slots: readonly BookingSlot[];
  selectedSlotId: string | null;
  onSelect: (slotId: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {slots.map((slot) => (
        <TimeSlot
          key={slot.id}
          slot={slot}
          selected={selectedSlotId === slot.id}
          onSelect={() => {
            onSelect(slot.id);
          }}
        />
      ))}
    </div>
  );
}
