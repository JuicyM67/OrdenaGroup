"use client";

// RechazarDialog — WP-45 (D-033): confirmación para nekar una solicitud
// (`bookings.status = 'requested'`), con un motivo opcional (GUIA §5: nunca
// "Cancelar", es una acción distinta). Compartido entre la campana de
// notificaciones (`notification-bell.tsx`) y el popover de la Agenda
// (`event-popover.tsx`) para no tener dos copias casi iguales.
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { solicitudes } from "@/i18n";

export type RechazarDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `motivo` se captura (coincide con `solicitudRechazada.cuerpo`s `motivo?`
   * parámetro), pero el llamador decide si lo usa: `declineBooking`
   * (`src/server/bookings/confirm.ts`, `ownerDecisionRequestSchema`) no
   * acepta hoy un motivo libre — ver el informe de WP-45. */
  onConfirm: (motivo: string) => Promise<void>;
};

export function RechazarDialog({
  open,
  onOpenChange,
  onConfirm,
}: RechazarDialogProps) {
  const [motivo, setMotivo] = useState("");

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setMotivo("");
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
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
          />
        </div>
      }
      confirmLabel={solicitudes.rechazarDialog.ctaSi}
      cancelLabel={solicitudes.rechazarDialog.ctaNo}
      onConfirm={async () => {
        await onConfirm(motivo);
        setMotivo("");
      }}
    />
  );
}
