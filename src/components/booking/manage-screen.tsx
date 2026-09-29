"use client";
// Kundens länk `/r/[token]` (WP-16 steg 5, D-029): se bokningen och avboka
// den inom fönstret. Härledd — ingen ritad referens (som datasteget/
// bekräftelsen i WP-13), men samma formspråk: mörk rubrik, `Card radius="tile"`
// för sammanfattningen, samma typografiskalor.
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextLink } from "@/components/ui/text-link";
import { comun, gestion } from "@/i18n";

import { CancelDialog } from "./cancel-dialog";
import {
  manageFields,
  manageState,
  mustParseInstant,
  type ManageCancelResult,
  type ManagedBooking,
} from "./manage-view";

export function ManageScreen({
  booking,
  now,
  onCancel,
}: {
  booking: ManagedBooking;
  /** Instant (ISO, med offset) för "nu", injicerad av `page.tsx` — aldrig
   * `new Date()` här. */
  now: string;
  onCancel: () => Promise<ManageCancelResult>;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [justCancelled, setJustCancelled] = useState(false);
  const [generalError, setGeneralError] = useState(false);

  const state = justCancelled
    ? "cancelled"
    : manageState(booking, mustParseInstant(now, "ManageScreen"));
  const fields = manageFields(booking);
  const reservarOtraHref = `/${booking.business.slug}`;

  async function handleConfirmCancel() {
    setGeneralError(false);
    const result = await onCancel();
    if (result.ok) {
      setJustCancelled(true);
      setDialogOpen(false);
      return;
    }
    // Ett race (t.ex. fönstret stängde mellan sidladdningen och klicket) —
    // `booking`/`now` är redan hämtade, så vi kan inte räkna om `state` här.
    // En generell fel-rad räcker: ett nytt besök på länken visar rätt läge.
    setDialogOpen(false);
    setGeneralError(true);
  }

  return (
    <div className="flex flex-col gap-6 p-5 pb-10">
      <div>
        <p className="text-13 font-semibold text-muted">
          {booking.business.name}
        </p>
        <h1 className="mt-1 font-display text-24 font-semibold tracking-title text-ink">
          {gestion.titulo}
        </h1>
      </div>

      <Card radius="tile" padding="lg" className="flex flex-col gap-3">
        <Row label={gestion.campos.servicio} value={fields.servicio} />
        <Row label={gestion.campos.dia} value={fields.dia} />
        <Row label={gestion.campos.hora} value={fields.hora} />
        <Row label={gestion.campos.profesional} value={fields.profesional} />
        <Row label={gestion.campos.direccion} value={fields.direccion} />
        <div className="font-display text-22 font-semibold text-ink">
          {fields.precio}
        </div>
      </Card>

      {state === "cancelled" ? (
        <div className="flex flex-col gap-3">
          <p role="status" className="text-14 font-semibold text-ink">
            {justCancelled
              ? gestion.cancelacionConfirmada
              : gestion.yaCancelada}
          </p>
          <TextLink href={reservarOtraHref}>
            {gestion.ctaReservarOtraHora}
          </TextLink>
        </div>
      ) : null}

      {state === "past" ? (
        <div className="flex flex-col gap-3">
          <p className="text-14 text-muted">{gestion.yaPaso}</p>
          <TextLink href={reservarOtraHref}>
            {gestion.ctaReservarOtraHora}
          </TextLink>
        </div>
      ) : null}

      {state === "locked" ? (
        <p className="text-14 text-muted">
          {gestion.fueraDePlazo({
            horas: booking.cancelWindowHours,
            telefonoNegocio: booking.business.phone ?? "",
          })}
        </p>
      ) : null}

      {state === "cancellable" ? (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => {
            setDialogOpen(true);
          }}
        >
          {gestion.ctaCancelarReserva}
        </Button>
      ) : null}

      {generalError ? (
        <p role="alert" className="text-13 text-ink">
          {comun.algoSalioMal}
        </p>
      ) : null}

      <CancelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-13 text-muted">{label}</span>
      <span className="text-right text-15 font-bold text-ink">{value}</span>
    </div>
  );
}
