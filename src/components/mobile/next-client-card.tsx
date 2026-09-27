"use client";

// Se docs/design/DESIGN.md §7 "NextClientCard" (Hoy). Statushanteringen i sig (fixture-läget,
// den optimistiska uppdateringens `disabled`-fönster) sköts av hoy-screen.tsx (FRÅGA 1) — den
// lokala `handledIdRef` här är bara ett andra skydd mot att ett enda fysiskt dubbeltryck hinner
// avfyra två klick innan `disabled` hunnit sättas.
import { useRef, type Ref } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { comun, hoy } from "@/i18n/es-CL";
import { formatTime, SANTIAGO } from "@/lib/format/dates";

import { nextChip, parseInstantOrThrow, relative } from "./hoy-view";
import type { HoyBooking } from "./types";

export type NextClientCardProps = {
  /** `undefined` visar tillståndet "sin-proxima". */
  booking: HoyBooking | undefined;
  now: Date;
  onArrived: () => void;
  onNoShow: () => void;
  /** Inaktiverar knapparna under den korta optimistiska uppdateringen (FRÅGA 1). */
  disabled?: boolean;
  ref?: Ref<HTMLElement>;
};

export function NextClientCard({
  booking,
  now,
  onArrived,
  onNoShow,
  disabled = false,
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
        className="flex flex-col gap-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime focus-visible:transition-none"
      >
        <p className="text-15 font-semibold text-on-dark-soft">
          {hoy.sinProximaReserva}
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
      className="flex flex-col gap-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime focus-visible:transition-none"
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
          {formatTime(start, SANTIAGO)}
        </div>
        <div className="mt-2.5 text-18 font-bold">{booking.clientName}</div>
        <div className="mt-0.5 text-14 text-on-dark-soft">
          {hoy.detalleCliente({
            servicio: booking.service,
            profesional: booking.staffName,
            visita: comun.visita({ n: booking.visitNumber }),
          })}
        </div>
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
