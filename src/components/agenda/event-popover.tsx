"use client";
// Se DESIGN.md §7 "Byggt i WP-12" och docs/design/reference/Agenda.dc.html (role="dialog").
// Radix Popover (icke-modal): Escape stänger och fokus går tillbaka till blocket (Radix
// standardbeteende). Llegó/No vino/Mover ändrar bara det lokala fixture-läget (WP-12
// FRÅGA 7) — servern kopplas in i WP-21.
import * as Popover from "@radix-ui/react-popover";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { IconButton } from "@/components/ui/icon-button";
import { roleIcons, strokeCard } from "@/components/ui/icons";
import { SANTIAGO } from "@/lib/format/dates";
import { agenda } from "@/i18n";

import { popoverModel } from "./agenda-view";
import type { AgendaBooking } from "./types";

const ClockIcon = roleIcons.tiempo as NonNullable<typeof roleIcons.tiempo>;
const PaymentIcon = roleIcons.pago as NonNullable<typeof roleIcons.pago>;

export type EventPopoverProps = {
  booking: AgendaBooking;
  staffName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLlego: () => void;
  onNoVino: () => void;
  onMover: () => void;
  trigger: ReactNode;
};

export function EventPopover({
  booking,
  staffName,
  open,
  onOpenChange,
  onLlego,
  onNoVino,
  onMover,
  trigger,
}: EventPopoverProps) {
  const model = popoverModel(booking, staffName, SANTIAGO);
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="left"
          align="start"
          sideOffset={16}
          alignOffset={-49}
          aria-label={agenda.popover.titulo}
          className="z-10 flex w-72.5 flex-col gap-3 rounded-panel bg-surface px-5 py-4.5 shadow-popover"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-17 font-bold">{model.name}</div>
              <div className="mt-0.5 text-12 text-muted">
                {model.telefonoYVisita}
              </div>
            </div>
            <Popover.Close asChild>
              <IconButton
                label={agenda.popover.cerrar}
                tone="ghost"
                size={30}
                className="text-muted"
              >
                <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
              </IconButton>
            </Popover.Close>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Chip size="sm" tone="pending">
              {booking.service}
            </Chip>
            <Chip size="sm" tone="neutral">
              {model.conProfesional}
            </Chip>
            {model.statusChip ? (
              <Chip size="sm" tone={model.statusChip.tone}>
                {model.statusChip.label}
              </Chip>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 text-13">
            <div className="flex items-center gap-2.5">
              <ClockIcon
                aria-hidden="true"
                className="size-4"
                strokeWidth={strokeCard}
              />
              {model.fechaYRango}
            </div>
            <div className="flex items-center gap-2.5">
              <PaymentIcon
                aria-hidden="true"
                className="size-4"
                strokeWidth={strokeCard}
              />
              {model.payment}
            </div>
          </div>

          <div className="mt-0.5 grid grid-cols-3 gap-2">
            <Button type="button" variant="primary" size="sm" onClick={onLlego}>
              {agenda.popover.acciones.llego}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onNoVino}
            >
              {agenda.popover.acciones.noVino}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onMover}
            >
              {agenda.popover.acciones.mover}
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
