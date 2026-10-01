"use client";

// "Enviar a clientes" (WP-30, F13): målgrupp + kanal + text för en hora flash. Återanvänder
// WP-31:s kampanjvokabulär (`campanas.nueva.audiencia`/`canal`/`mensajeLabel`, GUIA §2:
// samma vokabulär) i stället för egna strängar — bara dialogens egna rubrik/knapp/fel är
// nya (`flash.tarjeta.*`). Samma Dialog/bottenark-mönster som `flash-slot-dialog.tsx`.
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { clientSmsLengthInfo } from "@/components/customers/sms-length";
import { campanaErrorText } from "@/components/campaigns/error-text";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Pill } from "@/components/ui/pill";
import { TextField } from "@/components/ui/text-field";
import { Textarea } from "@/components/ui/textarea";
import { useSheetDrag } from "@/components/ui/use-sheet-drag";
import { campanas, comun, flash } from "@/i18n";

import type {
  FlashCampaignAudience,
  FlashCampaignAudienceKind,
  FlashCampaignChannel,
  SendFlashCampaignInput,
  SendFlashCampaignResult,
} from "./types";

export type SendFlashDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashSlotId: string;
  /** SMS bara en SE (D-025/D-026), samma spärr som Campañas. */
  smsAvailable: boolean;
  onSend: (input: SendFlashCampaignInput) => Promise<SendFlashCampaignResult>;
};

const AUDIENCE_KINDS: readonly FlashCampaignAudienceKind[] = [
  "all",
  "members",
  "regulars",
  "inactive",
];
const MESSAGE_MAX: Record<FlashCampaignChannel, number> = {
  email: 1000,
  sms: 320,
};
const DEFAULT_INACTIVE_DAYS = 60;

function flashCampaignErrorText(code: string): string {
  if (code === "flash_not_active") return flash.tarjeta.enviarErrorNoActiva;
  return campanaErrorText(code);
}

export function SendFlashDialog({
  open,
  onOpenChange,
  flashSlotId,
  smsAvailable,
  onSend,
}: SendFlashDialogProps) {
  const descriptionId = useId();
  const { panelRef, handleProps: dragHandleProps } = useSheetDrag(() =>
    onOpenChange(false),
  );
  const [audienceKind, setAudienceKind] =
    useState<FlashCampaignAudienceKind>("all");
  const [inactiveDays, setInactiveDays] = useState(
    String(DEFAULT_INACTIVE_DAYS),
  );
  const [channel, setChannel] = useState<FlashCampaignChannel>("email");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setAudienceKind("all");
    setInactiveDays(String(DEFAULT_INACTIVE_DAYS));
    setChannel("email");
    setMessage("");
    setSubmitting(false);
    setSent(null);
    setError(null);
  }

  const messageMax = MESSAGE_MAX[channel];
  const smsInfo = channel === "sms" ? clientSmsLengthInfo(message) : null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const trimmed = message.trim();
    if (!trimmed) return;
    const audience: FlashCampaignAudience =
      audienceKind === "inactive"
        ? {
            kind: "inactive",
            days: Number(inactiveDays) || DEFAULT_INACTIVE_DAYS,
          }
        : { kind: audienceKind };
    setSubmitting(true);
    setError(null);
    const result = await onSend({
      flashSlotId,
      channel,
      audience,
      message: trimmed,
    });
    setSubmitting(false);
    if (result.ok) {
      setSent(result.queued);
      return;
    }
    setError(flashCampaignErrorText(result.code));
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 flex items-end justify-center bg-ink/45 sm:items-center sm:p-4">
          <Dialog.Content
            ref={panelRef}
            aria-describedby={descriptionId}
            className="flex max-h-full w-full max-w-md translate-y-0 flex-col gap-4 overflow-y-auto rounded-t-panel bg-canvas p-6 shadow-popover transition-transform duration-200 ease-out sm:rounded-panel sheet-closed:translate-y-full"
          >
            <div
              aria-hidden="true"
              className="-mt-2 mb-1 h-1.5 w-10 shrink-0 touch-none self-center rounded-full bg-line-strong sm:hidden"
              {...dragHandleProps}
            />
            <div className="flex items-start justify-between">
              <Dialog.Title className="text-17 font-bold">
                {flash.tarjeta.enviarAClientes}
              </Dialog.Title>
              <Dialog.Close asChild>
                <IconButton label={comun.cerrar} tone="ghost" size={30}>
                  <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
                </IconButton>
              </Dialog.Close>
            </div>
            <Dialog.Description id={descriptionId} className="sr-only">
              {flash.tarjeta.enviarAClientes}
            </Dialog.Description>

            {sent !== null ? (
              <p role="status" className="text-14 font-semibold text-ink">
                {campanas.nueva.confirmarCuerpo({ n: sent })}
              </p>
            ) : (
              <form
                noValidate
                aria-busy={submitting}
                onSubmit={(e) => void handleSubmit(e)}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-2">
                  <span className="text-13 font-semibold text-ink">
                    {campanas.nueva.audienciaLabel}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {AUDIENCE_KINDS.map((kind) => (
                      <Pill
                        key={kind}
                        selected={audienceKind === kind}
                        onClick={() => setAudienceKind(kind)}
                      >
                        {campanas.nueva.audiencia[kind]}
                      </Pill>
                    ))}
                  </div>
                  {audienceKind === "inactive" ? (
                    <TextField
                      label={campanas.nueva.audienciaInactivosDiasLabel}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={730}
                      value={inactiveDays}
                      onChange={(e) => setInactiveDays(e.target.value)}
                      className="max-w-40"
                      required
                    />
                  ) : null}
                </div>

                {smsAvailable ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-13 font-semibold text-ink">
                      {campanas.nueva.canalLabel}
                    </span>
                    <div className="flex gap-2">
                      <Pill
                        selected={channel === "email"}
                        onClick={() => setChannel("email")}
                      >
                        {campanas.canal.email}
                      </Pill>
                      <Pill
                        selected={channel === "sms"}
                        onClick={() => setChannel("sms")}
                      >
                        {campanas.canal.sms}
                      </Pill>
                    </div>
                  </div>
                ) : null}

                <Textarea
                  label={campanas.nueva.mensajeLabel}
                  placeholder={campanas.nueva.mensajePlaceholder}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={messageMax}
                  rows={5}
                  hint={
                    smsInfo
                      ? `${campanas.nueva.contador({ n: message.length, max: messageMax })} · ${campanas.nueva.segmentosSms({ n: smsInfo.segments })}`
                      : campanas.nueva.contador({
                          n: message.length,
                          max: messageMax,
                        })
                  }
                  required
                />

                {error ? (
                  <p role="alert" className="text-13 text-ink">
                    {error}
                  </p>
                ) : null}

                <div className="mt-1 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => onOpenChange(false)}
                  >
                    {comun.cerrar}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={submitting || !message.trim()}
                  >
                    {submitting
                      ? campanas.nueva.enviando
                      : campanas.nueva.ctaEnviar}
                  </Button>
                </div>
              </form>
            )}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
