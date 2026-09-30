// WP-42: dagnavigering för agendans mobila dagvy (pilar, "Hoy" och "+ Nueva reserva").
// WP-50: `prevLabel`/`nextLabel` gör raden återanvändbar för månadsvyns navigering
// (`agenda-screen.tsx`) utan att döpa om `onPrevDay`/`onNextDay`. Día/Mes-växlaren lever i
// en egen rad ovanför (agenda-screen.tsx) — en sjätte knapp här trängde undan månadstiteln
// ("Octubre 2026" är längre än "Vie 2 oct", granskningsfynd).
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
  /** WP-46: `undefined` döljer knappen (samma motiv som `AgendaToolbar`). */
  onNewBooking?: () => void;
  prevLabel?: string;
  nextLabel?: string;
};

export function MobileDayNav({
  title,
  onToday,
  onPrevDay,
  onNextDay,
  onNewBooking,
  prevLabel = calendario.diaAnterior,
  nextLabel = calendario.diaSiguiente,
}: MobileDayNavProps) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="primary" size="xs" onClick={onToday}>
        {calendario.hoy}
      </Button>
      <IconButton label={prevLabel} tone="ghost" size={44} onClick={onPrevDay}>
        <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2.2} />
      </IconButton>
      <h1 className="flex-1 truncate text-center font-display text-18 font-bold tracking-display">
        {title}
      </h1>
      <IconButton label={nextLabel} tone="ghost" size={44} onClick={onNextDay}>
        <ChevronRight aria-hidden="true" className="size-5" strokeWidth={2.2} />
      </IconButton>
      {onNewBooking ? (
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
      ) : null}
    </div>
  );
}
