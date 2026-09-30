"use client";

// CustomerPrivacyActions — "Exportar datos"/"Anonimizar cliente" i agenda-popovern
// (WP-26 steg 7, F12: dataskydd i kundpanelen). `EventPopover` är den enda platsen i
// appen där ägaren ser en enskild kund kopplad till en bokning (ingen egen
// "Clientes"-skärm finns än, se `customer-answers-card.tsx`). Anonymisering är
// oåterkallelig (D-033) → `ConfirmDialog` (delad med `PrivacySection`/kontoradering).
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { clientes } from "@/i18n";

export type CustomerExportResult =
  { ok: true; data: unknown } | { ok: false; code: string };
export type CustomerMutationResult = { ok: true } | { ok: false; code: string };

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function CustomerPrivacyActions({
  customerId,
  onExport,
  onAnonymize,
  /** Anropas efter en lyckad anonymisering (stänger popovern och laddar om
   * agendan — `agenda-screen.tsx`). */
  onAnonymized,
}: {
  customerId: string;
  onExport: () => Promise<CustomerExportResult>;
  onAnonymize: () => Promise<CustomerMutationResult>;
  onAnonymized: () => void;
}) {
  const [exporting, setExporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    setError(undefined);
    try {
      const result = await onExport();
      if (result.ok) {
        downloadJson(`cliente-${customerId}.json`, result.data);
      } else {
        setError(clientes.privacidad.error);
      }
    } catch {
      setError(clientes.privacidad.error);
    } finally {
      setExporting(false);
    }
  }

  async function handleAnonymize() {
    setError(undefined);
    const result = await onAnonymize();
    if (result.ok) {
      setDialogOpen(false);
      onAnonymized();
    } else {
      setError(clientes.privacidad.error);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={exporting}
          onClick={() => void handleExport()}
          className="flex h-11 items-center justify-center rounded-control border border-border bg-surface px-3 text-13 font-semibold text-ink transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40"
        >
          {clientes.privacidad.ctaExportar}
        </button>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex h-11 items-center justify-center rounded-control border border-border bg-surface px-3 text-13 font-semibold text-ink transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {clientes.privacidad.ctaAnonimizar}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-12 font-semibold text-ink">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={clientes.privacidad.confirmarTitulo}
        body={clientes.privacidad.confirmarCuerpo}
        confirmLabel={clientes.privacidad.confirmarSi}
        cancelLabel={clientes.privacidad.confirmarNo}
        onConfirm={handleAnonymize}
      />
    </div>
  );
}
