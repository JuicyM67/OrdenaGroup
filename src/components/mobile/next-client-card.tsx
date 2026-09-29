"use client";

// Se docs/design/DESIGN.md §7 "NextClientCard" (Hoy). Statushanteringen i sig (fixture-läget,
// den optimistiska uppdateringens `disabled`-fönster) sköts av hoy-screen.tsx (FRÅGA 1) — den
// lokala `handledIdRef` här är bara ett andra skydd mot att ett enda fysiskt dubbeltryck hinner
// avfyra två klick innan `disabled` hunnit sättas.
import { useRef, type Ref } from "react";

import { AnswersList } from "@/components/booking/answers-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { comun, hoy } from "@/i18n";
import { formatTime, APP_TZ } from "@/lib/format/dates";

import { nextChip, parseInstantOrThrow, relative } from "./hoy-view";
import type { HoyBooking } from "./types";

// Fokusringen ligger 2 px INNANFÖR kortets kant (negativ outline-offset, ingen godtycklig
// [...]-syntax — se Tailwinds dokumenterade `-outline-offset-*`) i stället för utanför: med
// positiv offset hamnade lime-ringen på den ljusa canvas-ytan bakom kortet (~1,1:1 kontrast),
// inte på det mörka kortet (13,97:1) där den faktiskt syns (WCAG 1.4.11, granskningsfynd).
const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lime focus-visible:transition-none";

export type NextClientCardProps = {
  /** `undefined` visar tillståndet "sin-proxima" (eller "cerrado" via `emptyMessage`). */
  booking: HoyBooking | undefined;
  now: Date;
  onArrived: () => void;
  onNoShow: () => void;
  /** Inaktiverar knapparna under den korta optimistiska uppdateringen (FRÅGA 1). */
  disabled?: boolean;
  /** Text när `booking` saknas. Standard: `hoy.sinProximaReserva`. Stängd dag: skickar
   * anroparen `hoy.restoDia.diaCerrado` i stället, så texten inte motsäger listan. */
  emptyMessage?: string;
  ref?: Ref<HTMLElement>;
};

export function NextClientCard({
  booking,
  now,
  onArrived,
  onNoShow,
  disabled = false,
  emptyMessage,
  ref,
}: NextClientCardProps) {
  const handledIdRef = useRef<string | null>(null);

  if (!booking) {
    return (
      <Card
        as="section"
        tone="dark"
        radius="hero"
        padding="lg"
        aria-label={hoy.proximaReserva}
        tabIndex={-1}
        ref={ref}
        className={cn("flex flex-col gap-4", FOCUS_RING)}
      >
        <p className="text-15 font-semibold text-on-dark-soft">
          {emptyMessage ?? hoy.sinProximaReserva}
        </p>
      </Card>
    );
  }

  const start = parseInstantOrThrow(booking.start);
  const chip = nextChip(booking);
  const bookingId = booking.id;

  function handleArrived() {
    if (disabled || handledIdRef.current === bookingId) return;
    handledIdRef.current = bookingId;
    onArrived();
  }

  function handleNoShow() {
    if (disabled || handledIdRef.current === bookingId) return;
    handledIdRef.current = bookingId;
    onNoShow();
  }

  return (
    <Card
      as="section"
      tone="dark"
      radius="hero"
      padding="lg"
      aria-label={hoy.proximaReserva}
      tabIndex={-1}
      ref={ref}
      className={cn("flex flex-col gap-4", FOCUS_RING)}
    >
      <div className="flex items-center justify-between">
        <span className="text-13 text-on-dark-muted">
          {hoy.siguiente({ relativo: relative(now, start) })}
        </span>
        <Chip size="sm" weight="bold" tone={chip.tone}>
          {chip.label}
        </Chip>
      </div>
      <div>
        <div className="font-display text-44 leading-none font-semibold tracking-display">
          {formatTime(start, APP_TZ)}
        </div>
        <div className="mt-2.5 text-18 font-bold">{booking.clientName}</div>
        <div className="mt-0.5 text-14 text-on-dark-soft">
          {hoy.detalleCliente({
            servicio: booking.service,
            profesional: booking.staffName,
            visita: comun.visita({ n: booking.visitNumber }),
          })}
        </div>
        {booking.answers && booking.answers.length > 0 ? (
          <AnswersList
            answers={booking.answers}
            tone="dark"
            className="mt-3"
          />
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Button
          variant="accent"
          size="xl"
          disabled={disabled}
          onClick={handleArrived}
        >
          {hoy.acciones.llego}
        </Button>
        <Button
          variant="outline-dark"
          size="xl"
          disabled={disabled}
          onClick={handleNoShow}
        >
          {hoy.acciones.noVino}
        </Button>
      </div>
    </Card>
  );
}
