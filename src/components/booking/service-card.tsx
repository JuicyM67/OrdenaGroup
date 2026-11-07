// ServiceCard — Reserva.dc.html rad 37–48 / DESIGN.md §7.
import { Scissors } from "lucide-react";

import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { formatDuration } from "@/lib/format/dates";

import { formatServicePrice } from "./format-price";
import type { BookingService } from "./types";

const TINT_BG: Record<BookingService["tint"], string> = {
  lilac: "bg-lilac-50",
  peach: "bg-peach-50",
  lime: "bg-lime-50",
};

export function ServiceCard({
  service,
  selected,
  onSelect,
}: {
  service: BookingService;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-18 w-full items-center gap-3.5 rounded-tile border-2 bg-surface py-3 pr-4 pl-3 text-left transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none",
        selected ? "border-ink" : "border-transparent",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-avatar",
          TINT_BG[service.tint],
        )}
      >
        <Scissors
          aria-hidden="true"
          className="size-5"
          strokeWidth={strokeCard}
        />
      </span>
      <span className="min-w-0 grow">
        <span className="block text-15 font-bold text-ink">{service.name}</span>
        <span className="mt-0.5 block text-13 text-muted">
          {formatDuration(service.durationMin)}
        </span>
      </span>
      <span className="text-15 font-bold text-ink">
        {formatServicePrice(service)}
      </span>
    </button>
  );
}
