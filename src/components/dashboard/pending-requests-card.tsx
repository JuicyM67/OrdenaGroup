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
  onDecline: (bookingId: string) => Promise<{ ok: boolean }>;
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
}: PendingRequestsCardProps) {
  // Bort optimistiskt ur listan (samma `handledIds`-mönster som Llegó/No
  // vino i inicio-screen.tsx): inget `useEffect` — filtret räknas om varje
  // rendering, `router.refresh()` (InicioScreen) ger till slut samma lista.
  const [handledIds, setHandledIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const items = requests.filter((r) => !handledIds.has(r.id));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);

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

  async function handleDecline(bookingId: string) {
    setBusyId(bookingId);
    try {
      const result = await onDecline(bookingId);
      if (result.ok) setHandledIds((prev) => new Set(prev).add(bookingId));
    } finally {
      setBusyId(null);
      setDecliningId(null);
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
            <span className="text-14 font-semibold text-ink">
              {rowText(request)}
            </span>
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
          </li>
        ))}
      </ul>

      <RechazarDialog
        open={decliningId != null}
        onOpenChange={(next) => {
          if (!next) setDecliningId(null);
        }}
        onConfirm={async () => {
          if (decliningId) await handleDecline(decliningId);
        }}
      />
    </Card>
  );
}
