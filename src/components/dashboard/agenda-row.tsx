// Se DESIGN.md §7 "AgendaRow" och docs/tasks/plans/WP-11.md §4 steg 5. En rad i "Agenda de
// hoy". `<li>` (listan i agenda-today.tsx är en `<ul>`). Tiden visas alltid i Santiago,
// oavsett processens/webbläsarens tidszon (`formatTime`/`SANTIAGO`, inte `booking.start`
// tolkad med lokala Date-metoder).
import { Ellipsis } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { strokeCard } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { nav, inicio } from "@/i18n";
import { SANTIAGO, formatTime } from "@/lib/format/dates";

import { mustParseInstant, statusChip } from "./inicio-view";
import type { TodayBooking } from "./types";

export type AgendaRowProps = {
  booking: TodayBooking;
  onMoreOptions?: () => void;
};

export function AgendaRow({ booking, onMoreOptions }: AgendaRowProps) {
  const chip = statusChip(booking);
  return (
    <li className="flex h-15 items-center gap-4 border-t border-line-strong">
      <span className="w-13 shrink-0 text-15 font-bold">
        {formatTime(mustParseInstant(booking.start, "AgendaRow"), SANTIAGO)}
      </span>
      <Avatar
        shape="square"
        size={40}
        tone={booking.tint}
        initials={booking.initials}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-15 font-semibold">
          {booking.clientName}
        </div>
        <div className="truncate text-13 text-muted">
          {inicio.agendaHoy.fila({
            servicio: booking.service,
            profesional: booking.staff,
          })}
        </div>
      </div>
      <Chip tone={chip.tone} size="md">
        {chip.text}
      </Chip>
      <IconButton
        label={nav.masOpciones}
        tone="ghost"
        size={36}
        className="text-muted"
        onClick={onMoreOptions}
      >
        <Ellipsis
          aria-hidden="true"
          className="size-5"
          strokeWidth={strokeCard}
        />
      </IconButton>
    </li>
  );
}
