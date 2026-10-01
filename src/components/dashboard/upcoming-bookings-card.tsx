// WP-fixar-sv: "Próximas reservas" — igual que AgendaToday (agenda-today.tsx/agenda-row.tsx)
// pero sin límite a la semana actual: el dueño ve sus próximas reservas (hasta 10) aunque
// caigan en una semana futura, y cada fila lleva directo a esa semana en la Agenda
// (`/app/agenda?fecha=`). Misma forma de datos que "Agenda de hoy" (`TodayBooking`), así
// que `statusChip` se reutiliza tal cual.
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { TextLink } from "@/components/ui/text-link";
import { appHref } from "@/config/routes";
import { inicio } from "@/i18n";
import {
  APP_TZ,
  formatDate,
  formatTime,
  toLocalDate,
} from "@/lib/format/dates";

import { mustParseInstant, statusChip } from "./inicio-view";
import type { TodayBooking } from "./types";

export type UpcomingBookingsCardProps = {
  bookings: readonly TodayBooking[];
  href: string;
};

function UpcomingBookingRow({ booking }: { booking: TodayBooking }) {
  const start = mustParseInstant(booking.start, "UpcomingBookingRow");
  const chip = statusChip(booking);
  return (
    <li className="border-t border-line-strong">
      <Link
        href={`${appHref("appAgenda")}?fecha=${toLocalDate(start, APP_TZ)}`}
        prefetch={false}
        className="flex items-center gap-3 rounded-tile py-2.5 no-underline transition-colors duration-150 ease-out hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none"
      >
        <span className="w-25 shrink-0 text-13 font-semibold text-muted">
          {inicio.proximasReservas.fechaHora({
            fecha: formatDate(start, APP_TZ, "weekdayDayMonthShort"),
            hora: formatTime(start, APP_TZ),
          })}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-14 font-semibold">
            {booking.clientName}
          </div>
          <div className="truncate text-12 text-muted">
            {inicio.agendaHoy.fila({
              servicio: booking.service,
              profesional: booking.staff,
            })}
          </div>
        </div>
        <Chip tone={chip.tone} size="sm">
          {chip.text}
        </Chip>
      </Link>
    </li>
  );
}

export function UpcomingBookingsCard({
  bookings,
  href,
}: UpcomingBookingsCardProps) {
  return (
    <Card
      as="section"
      aria-label={inicio.proximasReservas.titulo}
      radius="card"
      padding="none"
      className="flex flex-col gap-1.5 px-5.5 py-5"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <h2 className="text-16 font-bold">{inicio.proximasReservas.titulo}</h2>
        <TextLink href={href} prefetch={false}>
          {inicio.proximasReservas.verAgenda}
        </TextLink>
      </div>
      {bookings.length === 0 ? (
        <p className="text-13 text-muted">{inicio.proximasReservas.vacio}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {bookings.map((booking) => (
            <UpcomingBookingRow key={booking.id} booking={booking} />
          ))}
        </ul>
      )}
    </Card>
  );
}
