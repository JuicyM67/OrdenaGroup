// BusinessHeader — Reserva.dc.html rad 21–33 (`Card tone="dark" radius="hero"`).
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { reserva } from "@/i18n";
import {
  formatLocalTimeRange,
  formatWeekdayRange,
  type IsoWeekday,
} from "@/lib/format/dates";
import { initialsOf } from "@/lib/format/initials";

import type { BookingBusiness } from "./types";

export function BusinessHeader({ business }: { business: BookingBusiness }) {
  // weekdaysOpen är en sammanhängande sekvens (F1: öppettider utan luckor), så
  // min/max räcker för `formatWeekdayRange(from, to)` ("Lun–Sáb").
  const first = Math.min(...business.weekdaysOpen) as IsoWeekday;
  const last = Math.max(...business.weekdaysOpen) as IsoWeekday;
  const dias = formatWeekdayRange(first, last);
  const rango = formatLocalTimeRange(business.open, business.close);

  return (
    <Card
      as="section"
      tone="dark"
      radius="hero"
      padding="lg"
      className="flex flex-col gap-3.5"
    >
      <div className="flex items-center gap-3.5">
        <div
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-icon bg-lime font-display text-22 font-bold text-ink"
        >
          {initialsOf(business.name)}
        </div>
        <div>
          <h1 className="font-display text-24 font-semibold tracking-title">
            {business.name}
          </h1>
          <div className="mt-0.5 text-13 text-on-dark-muted">
            {reserva.header.ubicacion({ comuna: business.comuna })}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip tone="dark" size="sm">
          {reserva.header.horario({ dias, rango })}
        </Chip>
        <Chip tone="dark" size="sm">
          {reserva.header.confirmacionWhatsapp}
        </Chip>
      </div>
    </Card>
  );
}
