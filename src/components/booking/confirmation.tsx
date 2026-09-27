// Confirmation — steg 6 (R1: ingen referens, samma formspråk). Ingen BookingBar
// (planens R "Ver mi reserva" visas inte förrän WP-20 har en token).
import { Check } from "lucide-react";

import { Card } from "@/components/ui/card";
import { reserva } from "@/i18n";

import type { BookingSelection } from "./flow-state";
import { summaryText } from "./summary";
import type { BookingPageData, DayAvailability } from "./types";

export function Confirmation({
  data,
  selection,
  day,
}: {
  data: BookingPageData;
  selection: BookingSelection;
  day: DayAvailability | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-icon bg-lime"
      >
        <Check className="size-6" strokeWidth={2.6} />
      </div>
      <h1 className="font-display text-24 font-semibold tracking-title text-ink">
        {reserva.confirmacion.titulo}
      </h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-16 font-bold text-ink">
          {reserva.confirmacion.resumenTitulo}
        </h2>
        <Card radius="tile" padding="lg">
          <div className="text-15 font-bold text-ink">
            {summaryText(selection, data, day)}
          </div>
        </Card>
      </section>

      <p className="text-14 leading-body text-muted">
        {reserva.confirmacion.avisoWhatsapp}
      </p>
      <p className="text-13 leading-body text-muted">
        {reserva.antesDeConfirmar.politicaCancelacion({
          horas: data.business.cancelWindowHours,
        })}
      </p>
    </div>
  );
}
