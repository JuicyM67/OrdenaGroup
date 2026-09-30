"use client";

// RechazarDialog — WP-45 (D-033): confirmación para nekar una solicitud
// (`bookings.status = 'requested'`), con un motivo opcional (GUIA §5: nunca
// "Cancelar", es una acción distinta). Compartido entre la campana de
// notificaciones (`notification-bell.tsx`), la lista de Inicio
// (`pending-requests-card.tsx`) y el popover de la Agenda
// (`event-popover.tsx`) para no tener tres copias casi iguales.
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { comun, solicitudes } from "@/i18n";
import { DECLINE_REASON_MAX } from "@/lib/validation/requests";

/** Lo que el llamador puede devolver: `error: "invalid_input"` (el servidor
 * rechazó el motivo, `ownerDecisionRequestSchema`) se muestra bajo el campo
 * y el motivo se conserva. */
export type RechazarResult = { ok: boolean; error?: string };

export type RechazarDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `motivo` (≤ `DECLINE_REASON_MAX`, opcional) va a `declineBooking`
   * (`src/server/bookings/confirm.ts`, `ownerDecisionRequestSchema.reason`)
   * y llega al cliente como `motivo` en `solicitudRechazada` (solo correo;
   * nunca se guarda en `bookings`). */
  onConfirm: (motivo: string) => Promise<void | RechazarResult>;
};

export function RechazarDialog({
  open,
  onOpenChange,
  onConfirm,
}: RechazarDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setMotivo("");
          setError(undefined);
        }
        onOpenChange(next);
      }}
      title={solicitudes.rechazarDialog.titulo}
      body={
        <div className="flex flex-col gap-3">
          <p>{solicitudes.rechazarDialog.cuerpo}</p>
          <Textarea
            label={solicitudes.rechazarDialog.motivoLabel}
            placeholder={solicitudes.rechazarDialog.motivoPlaceholder}
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setError(undefined);
            }}
            maxLength={DECLINE_REASON_MAX}
            rows={2}
            error={error}
          />
        </div>
      }
      confirmLabel={solicitudes.rechazarDialog.ctaSi}
      cancelLabel={solicitudes.rechazarDialog.ctaNo}
      onConfirm={async () => {
        const result = await onConfirm(motivo);
        if (result && !result.ok && result.error === "invalid_input") {
          setError(comun.algoSalioMal);
          return;
        }
        setMotivo("");
        setError(undefined);
      }}
    />
  );
}
