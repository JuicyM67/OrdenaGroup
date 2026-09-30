"use client";
// MessageDialog — "Enviar mensaje" en la ficha del cliente (WP-55,
// `/app/clientes/[id]`). Mismo patrón Radix Dialog que `ConfirmDialog`/
// `CancelDialog` (`rounded-panel bg-surface p-6 shadow-popover`, Escape/clic
// afuera cierra). Dos canales según la instalación (D-025, `marketConfig`):
//
// - CL (`channel="whatsapp"`): sin servidor — abre `https://wa.me/<tel>`
//   con el texto (regla dura 8: nunca un envío real desde un agente, y acá
//   tampoco desde el servidor todavía, D-006/D-007). TODO(WP-XX): reemplazar
//   por un envío real por WhatsApp Cloud API cuando esa integración exista
//   (INTEGRATIONS.md §1) — hoy el dueño confirma el envío en su propio
//   WhatsApp.
// - SE (`channel="sms"`): `onSend` (server action `sendCustomerMessage`,
//   encola `mensajeLibre` en `message_outbox`, D-028/ClickSend).
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Textarea } from "@/components/ui/textarea";
import { clientes, comun } from "@/i18n";
import { formatPhone, type E164 } from "@/lib/format/phone";

import { clientSmsLengthInfo } from "./sms-length";
import type { SendMessageResult } from "./types";

const MAX_LENGTH = 320;
const T = clientes.ficha.mensaje;

export type MessageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  /** E.164, ya validado por el llamador (el botón que abre esto solo existe
   * cuando `customer.phone` es un E.164 válido). */
  phone: E164;
  channel: "sms" | "whatsapp";
  /** Solo se llama cuando `channel === "sms"` — `undefined` en CL. */
  onSend?: (text: string) => Promise<SendMessageResult>;
};

type SendMessageErrorCode = Extract<SendMessageResult, { ok: false }>["code"];

function errorText(code: SendMessageErrorCode): string {
  switch (code) {
    case "forbidden":
      return T.error.forbidden;
    case "no_phone":
      return T.error.no_phone;
    case "too_long":
      return T.error.too_long;
    case "rate_limited":
      return T.error.rate_limited;
    default:
      return T.error.generico;
  }
}

export function MessageDialog({
  open,
  onOpenChange,
  customerName,
  phone,
  channel,
  onSend,
}: MessageDialogProps) {
  const descriptionId = useId();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const trimmed = text.trim();
  const smsInfo = channel === "sms" ? clientSmsLengthInfo(text) : null;

  function reset() {
    setText("");
    setStatus("idle");
    setErrorMsg(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleSend() {
    if (status === "sending" || trimmed.length === 0) return;
    if (channel === "whatsapp") {
      const url = `https://wa.me/${phone.replace("+", "")}?text=${encodeURIComponent(trimmed)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      handleOpenChange(false);
      return;
    }
    if (!onSend) return;
    setStatus("sending");
    setErrorMsg(null);
    try {
      const result = await onSend(trimmed);
      if (result.ok) {
        setStatus("sent");
        setText("");
      } else {
        setStatus("error");
        setErrorMsg(errorText(result.code));
      }
    } catch {
      setStatus("error");
      setErrorMsg(T.error.generico);
    }
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
                if (status === "sent" || status === "error") {
                  setStatus("idle");
                  setErrorMsg(null);
                }
              }}
              maxLength={MAX_LENGTH}
              rows={4}
              disabled={status === "sending"}
              hint={
                smsInfo
                  ? `${T.contador({ n: text.length, max: MAX_LENGTH })} · ${T.segmentosSms({ n: smsInfo.segments })}`
                  : T.contador({ n: text.length, max: MAX_LENGTH })
              }
            />

            {channel === "whatsapp" ? (
              <p className="text-13 text-muted">{T.notaWhatsapp}</p>
            ) : null}

            {status === "sent" ? (
              <span role="status" className="text-13 text-muted">
                {T.enviado}
              </span>
            ) : null}
            {status === "error" && errorMsg ? (
              <span role="alert" className="text-13 text-ink">
                {errorMsg}
              </span>
            ) : null}

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
                disabled={trimmed.length === 0 || status === "sending"}
                onClick={() => {
                  void handleSend();
                }}
              >
                {status === "sending" ? T.enviando : T.ctaEnviar}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
