// WP-97 (D-081): alla dagens tider ("Ver todas las horas"), grupperade i
// mañana (före 12), tarde (12–17) och noche (från 18). Samma knappar som
// `TimeSlotGrid`.
import { reserva } from "@/i18n";
import { APP_TZ, formatTime } from "@/lib/format/dates";

import { TimeSlotGrid } from "./time-slot-grid";
import type { BookingSlot } from "./types";

type Part = "manana" | "tarde" | "noche";

function partOfDay(slot: BookingSlot): Part {
  const hour = Number(formatTime(new Date(slot.start), APP_TZ).slice(0, 2));
  if (hour < 12) return "manana";
  return hour < 18 ? "tarde" : "noche";
}

export function TimeSlotGroups({
  slots,
  selectedSlotId,
  onSelect,
}: {
  slots: readonly BookingSlot[];
  selectedSlotId: string | null;
  onSelect: (slotId: string) => void;
}) {
  const parts: Part[] = ["manana", "tarde", "noche"];
  return (
    <div className="flex flex-col gap-4">
      {parts.map((part) => {
        const inPart = slots.filter((s) => partOfDay(s) === part);
        if (inPart.length === 0) return null;
        return (
          <section key={part} className="flex flex-col gap-2.5">
            <h3 className="text-13 font-bold text-muted">
              {reserva.todasLasHoras[part]}
            </h3>
            <TimeSlotGrid
              slots={inPart}
              selectedSlotId={selectedSlotId}
              onSelect={onSelect}
            />
          </section>
        );
      })}
    </div>
  );
}
