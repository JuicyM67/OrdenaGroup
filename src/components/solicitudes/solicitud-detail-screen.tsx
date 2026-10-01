"use client";

// /app/solicitudes/[id] (WP-56): mobil först — öppnas från sms/mejl-länken
// (ny bokningsförfrågan ELLER avbokningsförfrågan). Samma formspråk som
// `booking/manage-screen.tsx` (kundens `/r/[token]`): mörk rubrik,
// `Card radius="tile"` för sammanfattningen, stora knappar. Ingen egen
// *.dc.html-referens (härledd, som Ajustes → Reglas).
import { useState } from "react";

import { RechazarDialog } from "@/components/shared/rechazar-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TextLink } from "@/components/ui/text-link";
import { comun, estados, solicitudes } from "@/i18n";
import {
  APP_TZ,
  formatLocalDate,
  formatTime,
  parseInstant,
  toLocalDate,
} from "@/lib/format/dates";

import type { SolicitudActionResult, SolicitudDetail } from "./types";

export type SolicitudDetailScreenProps = {
  bookingId: string;
  businessName: string;
  detail: SolicitudDetail;
  agendaHref: string;
  /** `undefined` döljer respektive par av knappar (samma mönster som
   * `EventPopover`s `onMover`) — anroparen avgör vad den inloggade får göra
   * (`authorizeDecision`, samma regel som Confirmar/Rechazar i övriga UI:t). */
  onConfirm?: (bookingId: string) => Promise<SolicitudActionResult>;
  onDecline?: (
    bookingId: string,
    reason?: string,
  ) => Promise<SolicitudActionResult>;
  onApproveCancel?: (bookingId: string) => Promise<SolicitudActionResult>;
  onDeclineCancel?: (bookingId: string) => Promise<SolicitudActionResult>;
};

type LocalOutcome =
  "confirmada" | "rechazada" | "cancelacionAprobada" | "cancelacionRechazada";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-13 text-muted">{label}</span>
      <span className="text-right text-15 font-bold text-ink">{value}</span>
    </div>
  );
}

export function SolicitudDetailScreen({
  bookingId,
  businessName,
  detail,
  agendaHref,
  onConfirm,
  onDecline,
  onApproveCancel,
  onDeclineCancel,
}: SolicitudDetailScreenProps) {
  const [outcome, setOutcome] = useState<LocalOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineCancelOpen, setDeclineCancelOpen] = useState(false);
  const [error, setError] = useState(false);

  const r = parseInstant(detail.start);
  const fecha = r.ok
    ? formatLocalDate(toLocalDate(r.value, APP_TZ), "weekdayDayMonthLong")
    : "";
  const hora = r.ok ? formatTime(r.value, APP_TZ) : "";

  const isPendingBooking =
    detail.kind === "booking" && detail.status === "requested";
  const isPendingCancel =
    detail.kind === "cancel" && detail.status === "cancel_requested";

  async function handleConfirm() {
    if (!onConfirm || busy) return;
    setBusy(true);
    setError(false);
    try {
      const result = await onConfirm(bookingId);
      if (result.ok) setOutcome("confirmada");
      else setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleDecline(reason: string) {
    if (!onDecline) return;
    setBusy(true);
    setError(false);
    try {
      const result = await onDecline(bookingId, reason || undefined);
      if (result.ok) {
        setOutcome("rechazada");
        setDeclineOpen(false);
      } else {
        setError(true);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleApproveCancel() {
    if (!onApproveCancel || busy) return;
    setBusy(true);
    setError(false);
    try {
      const result = await onApproveCancel(bookingId);
      if (result.ok) setOutcome("cancelacionAprobada");
      else setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeclineCancel() {
    if (!onDeclineCancel) return;
    setBusy(true);
    setError(false);
    try {
      const result = await onDeclineCancel(bookingId);
      if (result.ok) {
        setOutcome("cancelacionRechazada");
        setDeclineCancelOpen(false);
      } else {
        setError(true);
      }
    } finally {
      setBusy(false);
    }
  }

  const titulo =
    detail.kind === "cancel"
      ? solicitudes.detalle.tituloCancelacion
      : solicitudes.detalle.tituloSolicitud;

  return (
    <div className="flex flex-col gap-6 p-5 pb-10">
      <div>
        <p className="text-13 font-semibold text-muted">{businessName}</p>
        <h1 className="mt-1 font-display text-24 font-semibold tracking-title text-ink">
          {titulo}
        </h1>
      </div>

      {detail.kind === "cancel" ? (
        <Chip tone="deposit" size="sm" className="self-start">
          {solicitudes.etiquetaCancelacion}
        </Chip>
      ) : null}

      <Card radius="tile" padding="lg" className="flex flex-col gap-3">
        <Row
          label={solicitudes.detalle.campos.cliente}
          value={detail.customerName}
        />
        <Row
          label={solicitudes.detalle.campos.servicio}
          value={detail.serviceName}
        />
        <Row
          label={solicitudes.detalle.campos.profesional}
          value={detail.staffName}
        />
        <Row
          label={solicitudes.detalle.campos.hora}
          value={r.ok ? `${fecha}, ${hora}` : ""}
        />
      </Card>

      {outcome ? (
        <div className="flex flex-col gap-3">
          <p role="status" className="text-14 font-semibold text-ink">
            {solicitudes.detalle.resultado[outcome]}
          </p>
          <TextLink href={agendaHref}>{solicitudes.detalle.verAgenda}</TextLink>
        </div>
      ) : isPendingBooking ? (
        <div className="flex flex-col gap-3">
          {onConfirm && onDecline ? (
            <>
              <Button
                type="button"
                variant="primary"
                size="xl"
                disabled={busy}
                onClick={() => void handleConfirm()}
              >
                {solicitudes.acciones.confirmar}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="xl"
                disabled={busy}
                onClick={() => setDeclineOpen(true)}
              >
                {solicitudes.acciones.rechazar}
              </Button>
            </>
          ) : (
            <Chip tone="pending" size="sm" className="self-start">
              {estados.porConfirmar}
            </Chip>
          )}
        </div>
      ) : isPendingCancel ? (
        <div className="flex flex-col gap-3">
          {onApproveCancel && onDeclineCancel ? (
            <>
              <Button
                type="button"
                variant="primary"
                size="xl"
                disabled={busy}
                onClick={() => void handleApproveCancel()}
              >
                {solicitudes.acciones.aprobarCancelacion}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="xl"
                disabled={busy}
                onClick={() => setDeclineCancelOpen(true)}
              >
                {solicitudes.acciones.rechazar}
              </Button>
            </>
          ) : (
            <Chip tone="deposit" size="sm" className="self-start">
              {estados.cancelacionPendiente}
            </Chip>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-14 text-muted">
            {solicitudes.detalle.yaRespondida}
          </p>
          <TextLink href={agendaHref}>{solicitudes.detalle.verAgenda}</TextLink>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-13 text-ink">
          {comun.algoSalioMal}
        </p>
      ) : null}

      <RechazarDialog
        open={declineOpen}
        onOpenChange={setDeclineOpen}
        onConfirm={(motivo) => handleDecline(motivo)}
      />

      <ConfirmDialog
        open={declineCancelOpen}
        onOpenChange={setDeclineCancelOpen}
        title={solicitudes.rechazarCancelacionDialog.titulo}
        body={solicitudes.rechazarCancelacionDialog.cuerpo}
        confirmLabel={solicitudes.rechazarCancelacionDialog.ctaSi}
        cancelLabel={solicitudes.rechazarCancelacionDialog.ctaNo}
        onConfirm={handleDeclineCancel}
      />
    </div>
  );
}
