"use client";
// MessageDialog — "Enviar mensaje" en la ficha del cliente (WP-55,
// `/app/clientes/[id]`). Mismo patrón Radix Dialog que `ConfirmDialog`/
// `CancelDialog` (`rounded-panel bg-surface p-6 shadow-popover`, Escape/clic
// afuera cierra). Sin servidor: abre `https://wa.me/<tel>` con el texto
// (regla dura 8: nunca un envío real desde un agente, y acá tampoco desde el
// servidor todavía, D-006/D-007). TODO(WP-XX): reemplazar por un envío real
// por WhatsApp Cloud API cuando esa integración exista (INTEGRATIONS.md §1) —
// hoy el dueño confirma el envío en su propio WhatsApp.
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Textarea } from "@/components/ui/textarea";
import { clientes, comun } from "@/i18n";
import { formatPhone, type E164 } from "@/lib/format/phone";

const MAX_LENGTH = 320;
const T = clientes.ficha.mensaje;

export type MessageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  /** E.164, ya validado por el llamador (el botón que abre esto solo existe
   * cuando `customer.phone` es un E.164 válido). */
  phone: E164;
};

export function MessageDialog({
  open,
  onOpenChange,
  customerName,
  phone,
}: MessageDialogProps) {
  const descriptionId = useId();
  const [text, setText] = useState("");

  const trimmed = text.trim();

  function reset() {
    setText("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleSend() {
    if (trimmed.length === 0) return;
    const url = `https://wa.me/${phone.replace("+", "")}?text=${encodeURIComponent(trimmed)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    handleOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 flex items-center justify-center bg-ink/45 p-4">
          <Dialog.Content
            aria-describedby={descriptionId}
            className="flex w-full max-w-sm flex-col gap-4 rounded-panel bg-surface p-6 shadow-popover"
          >
            <div className="flex items-start justify-between">
              <Dialog.Title className="text-17 font-bold text-ink">
                {T.titulo}
              </Dialog.Title>
              <Dialog.Close asChild>
                <IconButton label={comun.cerrar} tone="ghost" size={30}>
                  <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
                </IconButton>
              </Dialog.Close>
            </div>
            <Dialog.Description id={descriptionId} className="sr-only">
              {T.titulo}
            </Dialog.Description>

            <div className="flex items-center justify-between text-14">
              <span className="text-muted">{T.paraLabel}</span>
              <span className="font-semibold text-ink">
                {customerName} · {formatPhone(phone)}
              </span>
            </div>

            <Textarea
              label={T.textoLabel}
              placeholder={T.textoPlaceholder}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
              }}
              maxLength={MAX_LENGTH}
              rows={4}
              hint={T.contador({ n: text.length, max: MAX_LENGTH })}
            />

            <p className="text-13 text-muted">{T.notaWhatsapp}</p>

            <div className="mt-1 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => handleOpenChange(false)}
              >
                {T.ctaCancelar}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={trimmed.length === 0}
                onClick={handleSend}
              >
                {T.ctaEnviar}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
