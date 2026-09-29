"use client";
// Bekräftelsedialogen för "Cancelar reserva" (`/r/[token]`, WP-16 steg 5).
// Samma Radix Dialog-mönster som `agenda/move-dialog.tsx` (bekräfta-steget):
// `rounded-panel bg-surface p-6 shadow-popover`, Escape/klick utanför stänger.
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { comun, gestion } from "@/i18n";

export type CancelDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Kastar aldrig: fel hanteras av anroparen (samma kontrakt som
   * `MoveDialog`/`ManualBookingDialog`s `onSubmit`). */
  onConfirm: () => Promise<void>;
};

export function CancelDialog({
  open,
  onOpenChange,
  onConfirm,
}: CancelDialogProps) {
  const descriptionId = useId();
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 flex items-center justify-center bg-ink/45 p-4">
          <Dialog.Content
            aria-describedby={descriptionId}
            className="flex w-full max-w-sm flex-col gap-4 rounded-panel bg-surface p-6 shadow-popover"
          >
            <div className="flex items-start justify-between">
              <Dialog.Title className="text-17 font-bold text-ink">
                {gestion.confirmarCancelacion.titulo}
              </Dialog.Title>
              <Dialog.Close asChild>
                <IconButton label={comun.cerrar} tone="ghost" size={30}>
                  <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
                </IconButton>
              </Dialog.Close>
            </div>
            <Dialog.Description id={descriptionId} className="text-14 text-ink">
              {gestion.confirmarCancelacion.cuerpo}
            </Dialog.Description>

            <div className="mt-1 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => {
                  onOpenChange(false);
                }}
              >
                {gestion.confirmarCancelacion.ctaNo}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={submitting}
                onClick={() => {
                  void handleConfirm();
                }}
              >
                {gestion.confirmarCancelacion.ctaSi}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
