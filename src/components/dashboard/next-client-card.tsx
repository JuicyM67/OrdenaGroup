"use client";

// NextClientCard (Inicio) — WP-57 punkt 4 (ägarens UX-genomgång, "Inicio som 'dagens
// läge'"): samma mörka kort/komponentspec som Hoy (DESIGN.md §7 "NextClientCard"), men en
// egen, enklare version här i stället för att återanvända `mobile/next-client-card.tsx`
// rakt av — den komponenten kräver `HoyBooking` (`visitNumber`, `isMember`, `paymentId` …),
// fält som `loadOwnerInicio` inte hämtar (Inicios `TodayBooking` är en annan, enklare form,
// delad med `AgendaToday`/`AgendaRow`). Samma Llegó/No vino-logik (`onArrival`,
// `statusChip`) som redan fanns i Inicio innan den här skärmen byggdes om — ingen ny
// backend, bara en ny plats för den.
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { relative } from "@/components/mobile/hoy-view";
import { hoy, inicio } from "@/i18n";
import { formatTime, APP_TZ } from "@/lib/format/dates";

import { mustParseInstant, statusChip } from "./inicio-view";
import type { TodayBooking } from "./types";

// Samma motivering som mobile/next-client-card.tsx: fokusringen ligger innanför kortets
// mörka kant (positiv offset hamnar på den ljusa ytan bakom kortet, för låg kontrast).
const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lime focus-visible:transition-none";

export type NextClientCardProps = {
  /** `undefined` visar `emptyMessage` (ingen mer bokning idag). */
  booking: TodayBooking | undefined;
  now: Date;
  /** `undefined` döljer Llegó/No vino (saknar behörighet för just den bokningen). */
  onArrived?: () => void;
  onNoShow?: () => void;
  disabled?: boolean;
  emptyMessage?: string;
};

export function NextClientCard({
  booking,
  now,
  onArrived,
  onNoShow,
  disabled = false,
  emptyMessage,
}: NextClientCardProps) {
  if (!booking) {
    return (
      <Card
        as="section"
        tone="dark"
        radius="hero"
        padding="lg"
        aria-label={hoy.proximaReserva}
        className="flex flex-col justify-center gap-4"
      >
        <p className="text-15 font-semibold text-on-dark-soft">
          {emptyMessage ?? hoy.sinProximaReserva}
        </p>
      </Card>
    );
  }

  const start = mustParseInstant(booking.start, "NextClientCard");
  const chip = statusChip(booking);

  return (
    <Card
      as="section"
      tone="dark"
      radius="hero"
      padding="lg"
      aria-label={hoy.proximaReserva}
      className={cn("flex flex-col gap-4", FOCUS_RING)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-13 text-on-dark-muted">
          {hoy.siguiente({ relativo: relative(now, start) })}
        </span>
        <Chip size="sm" weight="bold" tone={chip.tone}>
          {chip.text}
        </Chip>
      </div>
      <div>
        <div className="font-display text-44 leading-none font-semibold tracking-display">
          {formatTime(start, APP_TZ)}
        </div>
        <div className="mt-2.5 text-18 font-bold">{booking.clientName}</div>
        <div className="mt-0.5 text-14 text-on-dark-soft">
          {inicio.agendaHoy.fila({
            servicio: booking.service,
            profesional: booking.staff,
          })}
        </div>
      </div>
      {onArrived || onNoShow ? (
        <div className="grid grid-cols-2 gap-2.5">
          {onArrived ? (
            <Button
              variant="accent"
              size="xl"
              disabled={disabled}
              onClick={onArrived}
            >
              {hoy.acciones.llego}
            </Button>
          ) : null}
          {onNoShow ? (
            <Button
              variant="outline-dark"
              size="xl"
              disabled={disabled}
              onClick={onNoShow}
            >
              {hoy.acciones.noVino}
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
