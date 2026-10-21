"use client";

// Tarjeta de una hora flash (/app/flash, WP-30). Sin referencia *.dc.html propia (fuera
// del alcance visual) — reutiliza Card/Chip/Button y el formspråk de otras tarjetas de la
// app. La imagen de story (`/api/flash/[id]/story.png`, integrations-engineer) se
// referencia por URL, sin import — si la ruta todavía no responde, `onError` la oculta en
// vez de mostrar un ícono de imagen rota.
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { flash } from "@/i18n";
import { APP_TZ, formatDate, formatTime } from "@/lib/format/dates";

import { SendFlashDialog } from "./send-flash-dialog";
import type {
  CancelFlashResult,
  FlashSlotView,
  SendFlashCampaignInput,
  SendFlashCampaignResult,
} from "./types";

export type FlashSlotCardProps = {
  slot: FlashSlotView;
  /** Länk till kundsidan, t.ex. "https://llena.cl/barberia-norte?flash=…". */
  publicUrl: string;
  /** `undefined` döljer "Enviar a clientes" (ingen behörighet att skicka utskick). */
  onSend?: (input: SendFlashCampaignInput) => Promise<SendFlashCampaignResult>;
  /** `undefined` döljer "Cancelar" (ingen behörighet, eller redan reservada). */
  onCancel?: (id: string) => Promise<CancelFlashResult>;
};

export function FlashSlotCard({
  slot,
  publicUrl,
  onSend,
  onCancel,
}: FlashSlotCardProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [imageOk, setImageOk] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const start = new Date(slot.start);
  const storyUrl = `/api/flash/${slot.id}/story.png`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  }

  async function handleCancel() {
    if (!onCancel) return;
    setCancelError(null);
    const result = await onCancel(slot.id);
    if (!result.ok) {
      setCancelError(flash.tarjeta.errorCancelar);
      return;
    }
    setConfirmOpen(false);
  }

  return (
    <Card
      radius="tile"
      padding="lg"
      className="flex flex-col gap-4 sm:flex-row"
    >
      {imageOk ? (
        // eslint-disable-next-line @next/next/no-img-element -- dynamisk server-genererad bild (/api/flash/[id]/story.png), ingen statisk tillgång att optimera.
        <img
          src={storyUrl}
          alt=""
          aria-hidden="true"
          onError={() => setImageOk(false)}
          className="h-40 w-24 shrink-0 rounded-tile object-cover sm:h-44 sm:w-26"
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Chip size="sm" tone="lime">
            {flash.tarjeta.descuento({ porcentaje: slot.discountPct })}
          </Chip>
          {slot.status === "booked" ? (
            <Chip size="sm" tone="deposit">
              {flash.tarjeta.reservada}
            </Chip>
          ) : null}
        </div>
        <div className="text-16 font-bold text-ink">{slot.staffName}</div>
        <div className="text-14 text-muted">
          {formatDate(start, APP_TZ, "weekdayDayShort")} ·{" "}
          {formatTime(start, APP_TZ)}
        </div>
        <div className="text-13 text-muted">
          {slot.serviceNames === null
            ? flash.todosLosServicios
            : slot.serviceNames.join(", ")}
        </div>

        <div className="mt-1 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void copyLink()}
          >
            {copied ? flash.tarjeta.linkCopiado : flash.tarjeta.copiarLink}
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a href={storyUrl} download>
              {flash.tarjeta.descargar}
            </a>
          </Button>
          {onSend && slot.status === "active" ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSendOpen(true)}
            >
              {flash.tarjeta.enviarAClientes}
            </Button>
          ) : null}
          {onCancel && slot.status === "active" ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              {flash.tarjeta.cancelar}
            </Button>
          ) : null}
        </div>
        {copyError ? (
          <p role="alert" className="text-13 font-semibold text-ink">
            {flash.tarjeta.errorCopiar}
          </p>
        ) : null}
        {cancelError ? (
          <p role="alert" className="text-13 font-semibold text-ink">
            {cancelError}
          </p>
        ) : null}
      </div>

      {onCancel ? (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={flash.tarjeta.cancelarDialogTitulo}
          body={flash.tarjeta.cancelarDialogCuerpo}
          confirmLabel={flash.tarjeta.cancelarConfirmarSi}
          cancelLabel={flash.tarjeta.cancelarConfirmarNo}
          onConfirm={handleCancel}
        />
      ) : null}
      {onSend ? (
        <SendFlashDialog
          open={sendOpen}
          onOpenChange={setSendOpen}
          flashSlotId={slot.id}
          onSend={onSend}
        />
      ) : null}
    </Card>
  );
}
