"use client";

// WP-86 (D-072): "Usar paquete" / "Devolver sesión" för en bokning — i
// agendans detaljvy (`agenda/event-popover.tsx`) och i Cajas "Por cobrar".
// Sessionen dras när ägaren markerar bokningen som utförd/betald, aldrig vid
// bokningen. Vid "No vino" bestämmer ägaren själv (egen knapptext + hjälp).
// Servern och databasen kontrollerar allt igen (kund, tjänst, saldo,
// giltighet, inte redan betald).
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { comun, paquetes } from "@/i18n";

import {
  packageErrorText,
  type BookingPackageActions as Actions,
  type BookingPackageInfo,
} from "./types";

export type BookingPackageActionsProps = {
  bookingId: string;
  info: BookingPackageInfo;
  /** `no_show` byter knapptext och visar hjälpen. */
  noShow?: boolean;
  actions: Actions;
  onChanged?: () => void;
};

export function BookingPackageActions({
  bookingId,
  info,
  noShow = false,
  actions,
  onChanged,
}: BookingPackageActionsProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undoOpen, setUndoOpen] = useState(false);

  async function handleUse() {
    if (!info.available || busy) return;
    setBusy(true);
    setError(null);
    const result = await actions.redeem({
      bookingId,
      customerPackageId: info.available.customerPackageId,
    });
    setBusy(false);
    if (result.ok) onChanged?.();
    else setError(packageErrorText(result.code));
  }

  async function handleUndo() {
    if (!info.use) return;
    const result = await actions.undo({ moveId: info.use.moveId });
    if (result.ok) {
      setUndoOpen(false);
      setError(null);
      onChanged?.();
    } else {
      setError(packageErrorText(result.code));
    }
  }

  if (info.use) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Chip size="sm" tone="success">
            {paquetes.usar.pagadaConPaquete}
          </Chip>
          <span className="text-12 text-muted">
            {info.use.packageName} ·{" "}
            {paquetes.usar.quedanTras({ n: info.use.remaining })}
          </span>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setError(null);
            setUndoOpen(true);
          }}
        >
          {paquetes.usar.devolver}
        </Button>
        {error ? (
          <p role="alert" className="text-12 text-ink">
            {error}
          </p>
        ) : null}
        <ConfirmDialog
          open={undoOpen}
          onOpenChange={setUndoOpen}
          title={paquetes.usar.devolverTitulo}
          body={paquetes.usar.devolverCuerpo}
          confirmLabel={paquetes.usar.devolver}
          cancelLabel={comun.volver}
          onConfirm={handleUndo}
        />
      </div>
    );
  }

  if (!info.available) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-12 text-muted">
        {paquetes.usar.disponible({
          nombre: info.available.name,
          n: info.available.remaining,
        })}
      </span>
      <Button
        type="button"
        variant="primary"
        size="sm"
        disabled={busy}
        onClick={() => void handleUse()}
      >
        {noShow ? paquetes.usar.ctaNoVino : paquetes.usar.cta}
      </Button>
      {noShow ? (
        <span className="text-12 text-muted">{paquetes.usar.ayudaNoVino}</span>
      ) : null}
      {error ? (
        <p role="alert" className="text-12 text-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
