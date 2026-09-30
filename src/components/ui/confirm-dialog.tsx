"use client";
// ConfirmDialog — bekräftelsedialog generisk för irreversibla/känsliga åtgärder (WP-26,
// F12: radera konto, anonymisera kund). Samma Radix Dialog-mönster som
// `src/components/booking/cancel-dialog.tsx`/`agenda/move-dialog.tsx`s bekräfta-steg
// (`rounded-panel bg-surface p-6 shadow-popover`, Escape/klick utanför stänger). Ingen egen
// "danger"-ton (DESIGN.md har ingen sådan token): samma primary/secondary-par som
// `CancelDialog`.
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { comun } from "@/i18n";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** Kastar aldrig: fel hanteras av anroparen (samma kontrakt som `CancelDialog`). */
  onConfirm: () => Promise<void>;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
}: ConfirmDialogProps) {
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
                {title}
              </Dialog.Title>
              <Dialog.Close asChild>
                <IconButton label={comun.cerrar} tone="ghost" size={30}>
                  <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
                </IconButton>
              </Dialog.Close>
            </div>
            <Dialog.Description id={descriptionId} className="text-14 text-ink">
              {body}
            </Dialog.Description>

            <div className="mt-1 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => onOpenChange(false)}
              >
                {cancelLabel}
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
                {confirmLabel}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
