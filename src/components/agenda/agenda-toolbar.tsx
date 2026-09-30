// Se DESIGN.md §7 "Byggt i WP-12" och docs/design/reference/Agenda.dc.html (rad h1…CTA).
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { calendario, agenda as agendaCopy } from "@/i18n";

import { strokeNuevaReserva } from "./icons";

export type AgendaToolbarProps = {
  title: string;
  onToday: () => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onNewBooking: () => void;
  /** WP-50: månadsvyn byter pilarna mot `calendario.mesAnterior`/`mesSiguiente` — standard
   * (vecko-/dagvyn) oförändrad. */
  prevLabel?: string;
  nextLabel?: string;
};

export function AgendaToolbar({
  title,
  onToday,
  onPrevWeek,
  onNextWeek,
  onNewBooking,
  prevLabel = calendario.semanaAnterior,
  nextLabel = calendario.semanaSiguiente,
}: AgendaToolbarProps) {
  return (
    <div className="flex h-12 items-center gap-3">
      <h1 className="font-display text-30 font-semibold tracking-display">
        {title}
      </h1>
      <Button type="button" variant="primary" size="xs" onClick={onToday}>
        {calendario.hoy}
      </Button>
      <IconButton
        label={prevLabel}
        tone="ghost"
        size={34}
        onClick={onPrevWeek}
      >
        <ChevronLeft
          aria-hidden="true"
          className="size-4.5"
          strokeWidth={2.2}
        />
      </IconButton>
      <IconButton
        label={nextLabel}
        tone="ghost"
        size={34}
        onClick={onNextWeek}
      >
        <ChevronRight
          aria-hidden="true"
          className="size-4.5"
          strokeWidth={2.2}
        />
      </IconButton>
      <div className="grow" />
      <Button type="button" variant="primary" size="lg" onClick={onNewBooking}>
        <Plus
          aria-hidden="true"
          className="size-4"
          strokeWidth={strokeNuevaReserva}
        />
        {agendaCopy.nuevaReserva}
      </Button>
    </div>
  );
}
