// TimeSlot — Reserva.dc.html rad 86–95 / DESIGN.md §7.
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { reserva } from "@/i18n";
import { formatTime, APP_TZ } from "@/lib/format/dates";

import type { BookingSlot } from "./types";

export function TimeSlot({
  slot,
  selected,
  onSelect,
}: {
  slot: BookingSlot;
  selected: boolean;
  onSelect: () => void;
}) {
  const hora = formatTime(new Date(slot.start), APP_TZ);
  const flash = slot.discountPct !== undefined;

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={
        flash
          ? `${reserva.horaAria({ hora })}, ${reserva.descuento({ porcentaje: slot.discountPct! })}`
          : reserva.horaAria({ hora })
      }
      onClick={onSelect}
      className={cn(
        "flex h-13 items-center justify-center gap-1.5 rounded-control text-15 font-bold transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none",
        selected ? "bg-ink text-on-dark" : "bg-surface text-ink",
      )}
    >
      <span>{hora}</span>
      {flash ? (
        <Chip tone="lime" size="badge">
          {reserva.descuento({ porcentaje: slot.discountPct! })}
        </Chip>
      ) : null}
    </button>
  );
}
