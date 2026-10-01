"use client";

// PendingRequestsCard — "Solicitudes por confirmar" (WP-45, D-033), överst
// på Inicio, ovanför "Agenda de hoy": härledd, dold när tomt (ingen egen
// referens, se `notification-bell.tsx` för samma motivering). Samma radform
// och Confirmar/Rechazar som klockans popover — anroparen (`InicioScreen`)
// äger den lokala tillståndet (`handledIds`) precis som Llegó/No vino, så
// klockan och den här listan alltid visar samma sak.
import { useState } from "react";

import type { PendingRequestItem } from "@/components/shared/notification-bell";
import { RechazarDialog } from "@/components/shared/rechazar-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { inicio, solicitudes } from "@/i18n";
import {
  APP_TZ,
  formatLocalDate,
  formatTime,
  parseInstant,
  toLocalDate,
} from "@/lib/format/dates";

export type PendingRequestsCardProps = {
  requests: readonly PendingRequestItem[];
  onConfirm: (bookingId: string) => Promise<{ ok: boolean }>;
  /** `reason`: ägarens valfria motiv (`RechazarDialog`), se
   * `notification-bell.tsx`. */
  onDecline: (bookingId: string, reason?: string) => Promise<{ ok: boolean }>;
  /** WP-56: filas `kind: "cancel"`, se `notification-bell.tsx`. */
  onApproveCancel?: (bookingId: string) => Promise<{ ok: boolean }>;
  onDeclineCancel?: (bookingId: string) => Promise<{ ok: boolean }>;
};

function rowText(request: PendingRequestItem): string {
  const r = parseInstant(request.start);
  if (!r.ok) return request.clientName;
  const date = toLocalDate(r.value, APP_TZ);
  return solicitudes.fila({
    cliente: request.clientName,
    servicio: request.service,
    fecha: formatLocalDate(date, "weekdayDayMonthShort"),
    hora: formatTime(r.value, APP_TZ),
  });
}

export function PendingRequestsCard({
  requests,
  onConfirm,
  onDecline,
  onApproveCancel,
  onDeclineCancel,
}: PendingRequestsCardProps) {
  // Bort optimistiskt ur listan (samma `handledIds`-mönster som Llegó/No
  // vino i inicio-screen.tsx): inget `useEffect` — filtret räknas om varje
  // rendering, `router.refresh()` (InicioScreen) ger till slut samma lista.
  const [handledIds, setHandledIds] = useState<ReadonlySet<string>>(new Set());
  const items = requests.filter((r) => !handledIds.has(r.id));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  // WP-56: ver `notification-bell.tsx`.
  const [decliningCancelId, setDecliningCancelId] = useState<string | null>(
    null,
  );

  if (items.length === 0) return null;

  async function handleConfirm(bookingId: string) {
    if (busyId) return;
    setBusyId(bookingId);
    try {
      const result = await onConfirm(bookingId);
      if (result.ok) setHandledIds((prev) => new Set(prev).add(bookingId));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(bookingId: string, reason: string) {
    setBusyId(bookingId);
    try {
      const result = await onDecline(bookingId, reason || undefined);
      if (result.ok) setHandledIds((prev) => new Set(prev).add(bookingId));
    } finally {
      setBusyId(null);
      setDecliningId(null);
    }
  }

  async function handleApproveCancel(bookingId: string) {
    if (busyId || !onApproveCancel) return;
    setBusyId(bookingId);
    try {
      const result = await onApproveCancel(bookingId);
      if (result.ok) setHandledIds((prev) => new Set(prev).add(bookingId));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeclineCancel(bookingId: string) {
    if (!onDeclineCancel) return;
    setBusyId(bookingId);
    try {
      const result = await onDeclineCancel(bookingId);
      if (result.ok) setHandledIds((prev) => new Set(prev).add(bookingId));
    } finally {
      setBusyId(null);
      setDecliningCancelId(null);
    }
  }

  return (
    <Card
      as="section"
      aria-label={inicio.solicitudes.titulo}
      radius="card"
      padding="none"
      className="flex flex-col gap-1.5 px-5.5 py-5"
    >
      <h2 className="text-18 font-bold">{inicio.solicitudes.titulo}</h2>
      <ul className="flex flex-col gap-1">
        {items.map((request) => (
          <li
            key={request.id}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-line-strong py-2.5"
          >
            <span className="flex min-w-0 items-center gap-2 text-14 font-semibold text-ink">
              {request.kind === "cancel" ? (
                <Chip tone="deposit" size="xs" className="shrink-0">
                  {solicitudes.etiquetaCancelacion}
                </Chip>
              ) : null}
              <span className="truncate">{rowText(request)}</span>
            </span>
            {request.kind === "cancel" ? (
              onApproveCancel && onDeclineCancel ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="xs"
                    disabled={busyId === request.id}
                    onClick={() => void handleApproveCancel(request.id)}
                  >
                    {solicitudes.acciones.aprobarCancelacion}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    disabled={busyId === request.id}
                    onClick={() => setDecliningCancelId(request.id)}
                  >
                    {solicitudes.acciones.rechazar}
                  </Button>
                </div>
              ) : null
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="xs"
                  disabled={busyId === request.id}
                  onClick={() => void handleConfirm(request.id)}
                >
                  {solicitudes.acciones.confirmar}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  disabled={busyId === request.id}
                  onClick={() => setDecliningId(request.id)}
                >
                  {solicitudes.acciones.rechazar}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <RechazarDialog
        open={decliningId != null}
        onOpenChange={(next) => {
          if (!next) setDecliningId(null);
        }}
        onConfirm={async (motivo) => {
          if (decliningId) await handleDecline(decliningId, motivo);
        }}
      />

      <ConfirmDialog
        open={decliningCancelId != null}
        onOpenChange={(next) => {
          if (!next) setDecliningCancelId(null);
        }}
        title={solicitudes.rechazarCancelacionDialog.titulo}
        body={solicitudes.rechazarCancelacionDialog.cuerpo}
        confirmLabel={solicitudes.rechazarCancelacionDialog.ctaSi}
        cancelLabel={solicitudes.rechazarCancelacionDialog.ctaNo}
        onConfirm={async () => {
          if (decliningCancelId) await handleDeclineCancel(decliningCancelId);
        }}
      />
    </Card>
  );
}
