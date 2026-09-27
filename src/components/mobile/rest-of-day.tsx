// Se docs/design/DESIGN.md §7 "Resto del día" (Hoy, listan under snabbåtgärderna).
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Chip } from "@/components/ui/chip";
import { hoy } from "@/i18n/es-CL";
import { formatClp } from "@/lib/format/clp";
import { formatTime, SANTIAGO } from "@/lib/format/dates";

import { parseInstantOrThrow, rowTag } from "./hoy-view";
import type { HoyBooking, StaffColor } from "./types";

const staffBarTone: Record<StaffColor, string> = {
  1: "bg-staff-1",
  2: "bg-staff-2",
  3: "bg-staff-3",
  4: "bg-staff-4",
  5: "bg-staff-5",
  6: "bg-staff-6",
};

const HEADING_ID = "hoy-resto-del-dia";

export type RestOfDayProps = {
  bookings: readonly HoyBooking[];
  dayCount: number;
  dayTotalClp: number;
  closedToday: boolean;
};

export function RestOfDay({
  bookings,
  dayCount,
  dayTotalClp,
  closedToday,
}: RestOfDayProps) {
  return (
    <Card
      as="section"
      aria-labelledby={HEADING_ID}
      padding="none"
      className="flex flex-col px-4.5 py-4"
    >
      <div className="mb-1 flex items-center justify-between">
        <h2 id={HEADING_ID} className="text-18 font-bold">
          {hoy.restoDia.titulo}
        </h2>
        <span className="text-13 text-muted">
          {hoy.restoDia.resumen({
            n: dayCount,
            monto: formatClp(dayTotalClp),
          })}
        </span>
      </div>
      {closedToday ? (
        <p className="py-3 text-14 text-muted">{hoy.restoDia.diaCerrado}</p>
      ) : bookings.length === 0 ? (
        <p className="py-3 text-14 text-muted">{hoy.restoDia.vacio}</p>
      ) : (
        <ul>
          {bookings.map((b) => {
            const start = parseInstantOrThrow(b.start);
            const tag = rowTag(b);
            return (
              <li
                key={b.id}
                className="flex h-14 items-center gap-3 border-t border-line"
              >
                <span className="w-11.5 text-14 font-bold">
                  {formatTime(start, SANTIAGO)}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-8 w-1.5 rounded-full",
                    staffBarTone[b.staffColor],
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-14 font-semibold">
                    {b.clientName}
                  </span>
                  <span className="block text-12 text-muted">
                    {hoy.restoDia.detalle({
                      servicio: b.service,
                      profesional: b.staffName,
                    })}
                  </span>
                </span>
                {tag ? (
                  <Chip size="xs" tone={tag.tone}>
                    {tag.label}
                  </Chip>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
