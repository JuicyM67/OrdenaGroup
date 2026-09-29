// WP-42: dagnavigering för agendans mobila dagvy (pilar, "Hoy" och "+ Nueva reserva").
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { calendario, agenda as agendaCopy } from "@/i18n";

import { strokeNuevaReserva } from "./icons";

export type MobileDayNavProps = {
  title: string;
  onToday: () => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onNewBooking: () => void;
};

export function MobileDayNav({
  title,
  onToday,
  onPrevDay,
  onNextDay,
  onNewBooking,
}: MobileDayNavProps) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="primary" size="xs" onClick={onToday}>
        {calendario.hoy}
      </Button>
      <IconButton
        label={calendario.diaAnterior}
        tone="ghost"
        size={44}
        onClick={onPrevDay}
      >
        <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2.2} />
      </IconButton>
      <h1 className="flex-1 truncate text-center font-display text-18 font-bold tracking-display">
        {title}
      </h1>
      <IconButton
        label={calendario.diaSiguiente}
        tone="ghost"
        size={44}
        onClick={onNextDay}
      >
        <ChevronRight aria-hidden="true" className="size-5" strokeWidth={2.2} />
      </IconButton>
      <IconButton
        label={agendaCopy.nuevaReserva}
        tone="ink"
        size={44}
        onClick={onNewBooking}
      >
        <Plus
          aria-hidden="true"
          className="size-5"
          strokeWidth={strokeNuevaReserva}
        />
      </IconButton>
    </div>
  );
}
