// Se DESIGN.md §7 "AgendaRow" och docs/tasks/plans/WP-11.md §4 steg 5. En rad i "Agenda de
// hoy". `<li>` (listan i agenda-today.tsx är en `<ul>`). Tiden visas alltid i appens tidszon,
// oavsett processens/webbläsarens tidszon (`formatTime`/`APP_TZ`, inte `booking.start`
// tolkad med lokala Date-metoder).
//
// WP-47: "…"-knappen öppnar en riktig meny (Llegó/No vino/Mover/Ver en agenda,
// `src/components/ui/menu.tsx`) i stället för att bara anropa `onMoreOptions`. Llegó/No
// vino/Mover är valfria (döljs om anroparen inte har kopplat en server action, t.ex. design
// lab) — "Ver en agenda" finns alltid, den behöver bara `booking.start`.
import { Ellipsis } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { strokeCard } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Menu, MenuButtonItem, MenuLinkItem } from "@/components/ui/menu";
import { agenda, nav, inicio } from "@/i18n";
import { APP_TZ, formatTime, toLocalDate } from "@/lib/format/dates";
import { initialsOf } from "@/lib/format/initials";

import { mustParseInstant, statusChip } from "./inicio-view";
import type { TodayBooking } from "./types";

export type AgendaRowProps = {
  booking: TodayBooking;
  /** WP-47: `markArrival` (server action, bunden i page.tsx). `undefined` → menyposten döljs. */
  onLlego?: () => void;
  onNoVino?: () => void;
  /** WP-47: öppnar `MoveDialog` (delad med Agenda). `undefined` → menyposten döljs. */
  onMover?: () => void;
};

export function AgendaRow({ booking, onLlego, onNoVino, onMover }: AgendaRowProps) {
  const chip = statusChip(booking);
  const start = mustParseInstant(booking.start, "AgendaRow");
  const verEnAgendaHref = `/app/agenda?vista=dia&fecha=${toLocalDate(start, APP_TZ)}`;
  return (
    <li className="flex h-15 items-center gap-4 border-t border-line-strong">
      <span className="w-13 shrink-0 text-15 font-bold">
        {formatTime(start, APP_TZ)}
      </span>
      <Avatar
        shape="square"
        size={40}
        tone={booking.tint}
        initials={initialsOf(booking.clientName)}
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
      <Menu
        label={nav.masOpciones}
        trigger={
          <IconButton
            label={nav.masOpciones}
            tone="ghost"
            size={36}
            className="text-muted"
          >
            <Ellipsis
              aria-hidden="true"
              className="size-5"
              strokeWidth={strokeCard}
            />
          </IconButton>
        }
      >
        {onLlego ? (
          <MenuButtonItem onClick={onLlego}>
            {agenda.popover.acciones.llego}
          </MenuButtonItem>
        ) : null}
        {onNoVino ? (
          <MenuButtonItem onClick={onNoVino}>
            {agenda.popover.acciones.noVino}
          </MenuButtonItem>
        ) : null}
        {onMover ? (
          <MenuButtonItem onClick={onMover}>
            {agenda.popover.acciones.mover}
          </MenuButtonItem>
        ) : null}
        <MenuLinkItem href={verEnAgendaHref} prefetch={false}>
          {inicio.agendaHoy.verEnAgenda}
        </MenuLinkItem>
      </Menu>
    </li>
  );
}
