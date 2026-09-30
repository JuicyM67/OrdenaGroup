// Se DESIGN.md §7 "AgendaRow" (StatTile-kolumnen) och docs/tasks/plans/WP-11.md §4 steg 5.
// `min-h-0` på både kortet och listan: utan det vägrar flex-kolumnen krympa under
// innehållets naturliga höjd, och "Agenda de hoy" skulle tvinga fram sidscroll i stället för
// att scrolla internt (sidan får aldrig klippa bort bokningar, §4 steg 5).
import { Card } from "@/components/ui/card";
import { TextLink } from "@/components/ui/text-link";
import { inicio } from "@/i18n";

import { AgendaRow } from "./agenda-row";
import type { TodayBooking } from "./types";

export type AgendaTodayProps = {
  bookings: readonly TodayBooking[];
  href: string;
  /** WP-47: Llegó/No vino från "…"-menyn (agenda-row.tsx). `undefined` döljer menyposterna. */
  onArrival?: (bookingId: string, status: "completed" | "no_show") => void;
  /** WP-47: "Mover" från "…"-menyn — öppnar `MoveDialog` (inicio-screen.tsx). */
  onMover?: (booking: TodayBooking) => void;
};

export function AgendaToday({
  bookings,
  href,
  onArrival,
  onMover,
}: AgendaTodayProps) {
  return (
    <Card
      as="section"
      aria-label={inicio.agendaHoy.titulo}
      radius="card"
      padding="none"
      className="flex min-h-0 flex-1 flex-col gap-1.5 px-5.5 py-5"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <h2 className="text-18 font-bold">{inicio.agendaHoy.titulo}</h2>
        <TextLink href={href} prefetch={false}>
          {inicio.agendaHoy.verAgenda}
        </TextLink>
      </div>
      {bookings.length === 0 ? (
        <p className="text-14 text-muted">{inicio.agendaHoy.vacio}</p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
          {bookings.map((booking) => (
            <AgendaRow
              key={booking.id}
              booking={booking}
              onLlego={
                onArrival ? () => onArrival(booking.id, "completed") : undefined
              }
              onNoVino={
                onArrival ? () => onArrival(booking.id, "no_show") : undefined
              }
              onMover={onMover ? () => onMover(booking) : undefined}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
