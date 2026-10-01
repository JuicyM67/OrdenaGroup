// Se docs/design/DESIGN.md §7 "Resto del día" (Hoy, listan under snabbåtgärderna).
//
// WP-57 (punkt 5, UX-genomgång "Resten av dagen kan få luckor utskrivna, så att Blixten
// används där den behövs"): dagens lediga luckor (`gaps`, samma `FreeGap`-form som
// Blixttiders tomma läge, src/server/flash/gaps.ts) vävs in i listan, sorterade med
// bokningarna på starttid. En lucka renderas med "Gör till Blixttid" (`flash.vacio.
// ctaConvertir`), som länkar till `/app/flash?ny=1&staff=<staffId>&start=<ISO>` — C:s
// "Nueva hora flash"-dialog läser de parametrarna och öppnas redan ifylld.
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Chip } from "@/components/ui/chip";
import { appHref } from "@/config/routes";
import { estados, flash, hoy } from "@/i18n";
import { formatMoney } from "@/lib/format/money";
import { formatTime, formatTimeRange, APP_TZ } from "@/lib/format/dates";

import { isMemberBooking, parseInstantOrThrow, rowTag } from "./hoy-view";
import type { HoyBooking, HoyGap, StaffColor } from "./types";

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
  gaps: readonly HoyGap[];
  dayCount: number;
  dayTotalClp: number;
  closedToday: boolean;
};

type Entry =
  | { kind: "booking"; start: Date; booking: HoyBooking }
  | { kind: "gap"; start: Date; gap: HoyGap };

function mergedEntries(
  bookings: readonly HoyBooking[],
  gaps: readonly HoyGap[],
): Entry[] {
  const entries: Entry[] = [
    ...bookings.map((booking): Entry => ({
      kind: "booking",
      start: parseInstantOrThrow(booking.start),
      booking,
    })),
    ...gaps.map((gap): Entry => ({
      kind: "gap",
      start: parseInstantOrThrow(gap.start),
      gap,
    })),
  ];
  return entries.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function GapRow({ gap }: { gap: HoyGap }) {
  const start = parseInstantOrThrow(gap.start);
  const end = parseInstantOrThrow(gap.end);
  const href = `${appHref("appFlash")}?ny=1&staff=${encodeURIComponent(gap.staffId)}&start=${encodeURIComponent(gap.start)}`;
  return (
    <li className="flex h-14 items-center gap-3 border-t border-line">
      <span className="w-11.5 text-14 font-bold text-muted">
        {formatTime(start, APP_TZ)}
      </span>
      <span className="min-w-0 flex-1 truncate text-13 text-muted">
        {flash.vacio.hueco({
          dia: flash.vacio.hoy,
          rango: formatTimeRange(start, end, APP_TZ),
          profesional: gap.staffName,
        })}
      </span>
      <Link
        href={href}
        prefetch={false}
        className="shrink-0 rounded-chip bg-lime px-2.5 py-1.25 text-12 font-bold text-ink transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none"
      >
        {flash.vacio.ctaConvertir}
      </Link>
    </li>
  );
}

export function RestOfDay({
  bookings,
  gaps,
  dayCount,
  dayTotalClp,
  closedToday,
}: RestOfDayProps) {
  const entries = mergedEntries(bookings, gaps);
  return (
    <Card
      as="section"
      aria-labelledby={HEADING_ID}
      padding="none"
      className="flex flex-col px-4.5 py-4"
    >
      <div className="mb-1 flex items-center justify-between">
        <h2 id={HEADING_ID} className="text-16 font-bold">
          {hoy.restoDia.titulo}
        </h2>
        <span className="text-13 text-muted">
          {hoy.restoDia.resumen({
            n: dayCount,
            monto: formatMoney(dayTotalClp),
          })}
        </span>
      </div>
      {closedToday ? (
        <p className="py-3 text-14 text-muted">{hoy.restoDia.diaCerrado}</p>
      ) : entries.length === 0 ? (
        <p className="py-3 text-14 text-muted">{hoy.restoDia.vacio}</p>
      ) : (
        <ul>
          {entries.map((entry) =>
            entry.kind === "gap" ? (
              <GapRow
                key={`gap-${entry.gap.staffId}-${entry.gap.start}`}
                gap={entry.gap}
              />
            ) : (
              <BookingRow key={entry.booking.id} booking={entry.booking} />
            ),
          )}
        </ul>
      )}
    </Card>
  );
}

function BookingRow({ booking: b }: { booking: HoyBooking }) {
  const start = parseInstantOrThrow(b.start);
  const tag = rowTag(b);
  return (
    <li className="flex h-14 items-center gap-3 border-t border-line">
      <span className="w-11.5 text-14 font-bold">
        {formatTime(start, APP_TZ)}
      </span>
      <span
        aria-hidden="true"
        className={cn("h-8 w-1.5 rounded-full", staffBarTone[b.staffColor])}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-14 font-semibold">{b.clientName}</span>
        <span className="block text-12 text-muted">
          {hoy.restoDia.detalle({
            servicio: b.service,
            profesional: b.staffName,
          })}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {isMemberBooking(b) ? (
          <Chip size="xs" tone="lavender">
            {estados.socio}
          </Chip>
        ) : null}
        {tag ? (
          <Chip size="xs" tone={tag.tone}>
            {tag.label}
          </Chip>
        ) : null}
      </span>
    </li>
  );
}
