"use client";
// Se DESIGN.md §7 "Byggt i WP-12" och docs/design/reference/Agenda.dc.html (role="dialog").
// Radix Popover (icke-modal): Escape stänger och fokus går tillbaka till blocket (Radix
// standardbeteende). Llegó/No vino sparas mot servern sedan WP-21 (se agenda-screen.tsx).
// Mover finns bara i design lab (WP-12 FRÅGA 7) — `onMover` saknas på den riktiga routen,
// se `agenda-screen.tsx` (`showMover`), och knappen döljs helt (utanför WP-21:s scope).
import * as Popover from "@radix-ui/react-popover";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { AnswersList } from "@/components/booking/answers-list";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { IconButton } from "@/components/ui/icon-button";
import { roleIcons, strokeCard } from "@/components/ui/icons";
import type { TimeZone } from "@/lib/format/dates";
import { agenda } from "@/i18n";

import { popoverModel } from "./agenda-view";
import type { AgendaBooking } from "./types";

const ClockIcon = roleIcons.tiempo as NonNullable<typeof roleIcons.tiempo>;
const PaymentIcon = roleIcons.pago as NonNullable<typeof roleIcons.pago>;

export type EventPopoverProps = {
  booking: AgendaBooking;
  staffName: string;
  tz: TimeZone;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLlego: () => void;
  onNoVino: () => void;
  /** `undefined` döljer knappen (WP-21: Mover finns bara i design lab). */
  onMover?: () => void;
  trigger: ReactNode;
};

export function EventPopover({
  booking,
  staffName,
  tz,
  open,
  onOpenChange,
  onLlego,
  onNoVino,
  onMover,
  trigger,
}: EventPopoverProps) {
  const model = popoverModel(booking, staffName, tz);
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

          {booking.answers && booking.answers.length > 0 ? (
            <AnswersList answers={booking.answers} />
          ) : null}

          <div
            className={cn(
              "mt-0.5 grid gap-2",
              onMover ? "grid-cols-3" : "grid-cols-2",
            )}
          >
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
            {onMover ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onMover}
              >
                {agenda.popover.acciones.mover}
              </Button>
            ) : null}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
