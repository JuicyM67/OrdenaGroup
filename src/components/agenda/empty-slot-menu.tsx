"use client";

// WP-30: menyn som öppnas vid klick på ett tomt fält i rutnätet ("Nueva reserva"/"Hora
// flash"). Radix Popover med en virtuell ankare (`Popover.Anchor`, fast positionerad vid
// klickpunkten) i stället för en vanlig `Popover.Trigger` — det finns ingen riktig
// triggerknapp, bara en klickkoordinat (samma Popover-yta/tokens som `ui/menu.tsx`).
import * as Popover from "@radix-ui/react-popover";
import { Plus, Zap } from "lucide-react";

import { strokeCard } from "@/components/ui/icons";
import { agenda } from "@/i18n";

export type EmptySlotMenuTarget = {
  clientX: number;
  clientY: number;
};

export type EmptySlotMenuProps = {
  target: EmptySlotMenuTarget | null;
  onClose: () => void;
  onNuevaReserva: () => void;
  onHoraFlash?: () => void;
};

const itemClassName =
  "flex h-11 w-full shrink-0 items-center gap-2.5 rounded-control px-3 text-14 font-semibold text-ink transition-colors duration-150 ease-out hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none";

export function EmptySlotMenu({
  target,
  onClose,
  onNuevaReserva,
  onHoraFlash,
}: EmptySlotMenuProps) {
  return (
    <Popover.Root
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Popover.Anchor
        className="fixed"
        style={{
          top: target?.clientY ?? 0,
          left: target?.clientX ?? 0,
          width: 1,
          height: 1,
        }}
      />
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          collisionPadding={12}
          aria-label={agenda.celdaVacia.menuAria}
          className="z-20 flex w-52 flex-col gap-0.5 rounded-panel bg-surface p-1.5 shadow-popover"
        >
          <button
            type="button"
            className={itemClassName}
            onClick={() => {
              onClose();
              onNuevaReserva();
            }}
          >
            <Plus
              aria-hidden="true"
              className="size-4 shrink-0 text-muted"
              strokeWidth={strokeCard}
            />
            {agenda.celdaVacia.nuevaReserva}
          </button>
          {onHoraFlash ? (
            <button
              type="button"
              className={itemClassName}
              onClick={() => {
                onClose();
                onHoraFlash();
              }}
            >
              <Zap
                aria-hidden="true"
                className="size-4 shrink-0 text-muted"
                strokeWidth={strokeCard}
              />
              {agenda.celdaVacia.horaFlash}
            </button>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
