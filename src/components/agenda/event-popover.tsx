"use client";
// Se DESIGN.md §7 "Byggt i WP-12" och docs/design/reference/Agenda.dc.html (role="dialog").
// Radix Popover (icke-modal): Escape stänger och fokus går tillbaka till blocket (Radix
// standardbeteende). Llegó/No vino sparas mot servern sedan WP-21 (se agenda-screen.tsx).
// Mover finns bara i design lab (WP-12 FRÅGA 7) — `onMover` saknas på den riktiga routen,
// se `agenda-screen.tsx` (`showMover`), och knappen döljs helt (utanför WP-21:s scope).
import * as Popover from "@radix-ui/react-popover";
import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { AnswersList } from "@/components/booking/answers-list";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { IconButton } from "@/components/ui/icon-button";
import { roleIcons, strokeCard } from "@/components/ui/icons";
import type { TimeZone } from "@/lib/format/dates";
import { agenda } from "@/i18n";

import { popoverModel } from "./agenda-view";
import {
  CustomerPrivacyActions,
  type CustomerExportResult,
  type CustomerMutationResult,
} from "./customer-privacy-actions";
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
  /** WP-26 steg 7 (F12): "Exportar datos"/"Anonimizar cliente". `undefined`
   * (design lab) eller en bokning utan `customerId` döljer hela raden —
   * se `customer-privacy-actions.tsx`. */
  onExportCustomer?: (customerId: string) => Promise<CustomerExportResult>;
  onAnonymizeCustomer?: (customerId: string) => Promise<CustomerMutationResult>;
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
  onExportCustomer,
  onAnonymizeCustomer,
  trigger,
}: EventPopoverProps) {
  const model = popoverModel(booking, staffName, tz);
  const customerId = booking.customerId;
  // WP-42: `side="left" alignOffset={-49}` (desktopens Agenda.dc.html-placering, 1440 px
  // brett rutnät med gott om utrymme till vänster om triggern) klipps mot vänsterkanten på
  // en 390 px mobil (Radix Popper flippar inte förbi ett explicit `alignOffset`). Under `lg`
  // används i stället en placering under triggern, centrerad och klämd inom skärmen av
  // Poppers egen `shift`. `matchMedia` läses direkt (lazy `useState`-initierare) i stället
  // för `useEffect`: `Popover.Content` monteras bara när `open` är sant (Radix), och
  // popovern öppnas alltid efter ett klick — långt efter hydrering — så det finns inget
  // server-/klientmarkup att stämma av mot (ingen hydreringsrisk) och `npm run visual
  // agenda` (`hasPopover: true`, 1440 px) påverkas inte. `addEventListener("change", …)`
  // täcker bara en live storleksändring av samma flik (sällsynt, men billigt att stödja).
  // jsdom (Vitest) saknar `window.matchMedia` helt — samma vakt som
  // `use-desktop-layout.ts` (agenda-screen.tsx).
  const hasMatchMedia =
    typeof window !== "undefined" && typeof window.matchMedia === "function";
  const [compact, setCompact] = useState(
    () => hasMatchMedia && window.matchMedia("(max-width: 1023px)").matches,
  );
  useEffect(() => {
    if (!hasMatchMedia) return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setCompact(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [hasMatchMedia]);
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={compact ? "bottom" : "left"}
          align={compact ? "center" : "start"}
          sideOffset={compact ? 8 : 16}
          alignOffset={compact ? 0 : -49}
          collisionPadding={12}
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

          {customerId && onExportCustomer && onAnonymizeCustomer ? (
            <CustomerPrivacyActions
              customerId={customerId}
              onExport={() => onExportCustomer(customerId)}
              onAnonymize={() => onAnonymizeCustomer(customerId)}
              onAnonymized={() => onOpenChange(false)}
            />
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
