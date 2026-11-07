// ChosenServiceCard — sammanfattning av tjänsten som kunden redan valt på
// profilsidan (WP-81), med "Cambiar servicio". Samma visuella språk som ServiceCard.
import { Scissors } from "lucide-react";

import { strokeCard } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import { reserva } from "@/i18n";
import { formatDuration } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";

import type { BookingService } from "./types";

const TINT_BG: Record<BookingService["tint"], string> = {
  lilac: "bg-lilac-50",
  peach: "bg-peach-50",
  lime: "bg-lime-50",
};

export function ChosenServiceCard({
  service,
  onChange,
}: {
  service: BookingService;
  onChange: () => void;
}) {
  return (
    <div
      role="group"
      aria-label={reserva.servicioElegido.etiqueta}
      className="flex min-h-18 w-full items-center gap-3.5 rounded-tile bg-surface py-3 pr-3 pl-3"
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
          {formatDuration(service.durationMin)} ·{" "}
          {formatMoney(service.priceClp)}
        </span>
      </span>
      <button
        type="button"
        onClick={onChange}
        aria-label={reserva.servicioElegido.cambiarAria({
          nombre: service.name,
        })}
        className="inline-flex min-h-11 shrink-0 items-center rounded-event px-3 text-13 font-semibold text-ink underline transition-colors duration-150 ease-out hover:text-pending-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none"
      >
        {reserva.servicioElegido.cambiar}
      </button>
    </div>
  );
}
