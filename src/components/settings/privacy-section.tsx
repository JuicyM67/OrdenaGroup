"use client";

// Sección "Privacidad y datos" (WP-26 steg 7, F12): exportera företagets data (JSON-
// nedladdning) och radera kontot med 30 dagars ångerfrist. Samma "ett Card per block"-
// formspråk som resten av Ajustes (ingen egen referens, se `ajustes-screen.tsx`).
// `ConfirmDialog` (src/components/ui/confirm-dialog.tsx) delas med kundens anonymisering
// (agenda-popovern).
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ajustes } from "@/i18n";
import { APP_TZ, formatDate } from "@/lib/format/dates";

import { ajustesErrorText } from "./error-text";

const DELETION_GRACE_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type PrivacyActions = {
  exportBusiness: () => Promise<
    { ok: true; data: unknown } | { ok: false; code: string }
  >;
  requestDeletion: () => Promise<{ ok: true } | { ok: false; code: string }>;
  cancelDeletion: () => Promise<{ ok: true } | { ok: false; code: string }>;
};

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

export function PrivacySection({
  slug,
  deletionRequestedAt: initialDeletionRequestedAt,
  actions,
}: {
  slug: string;
  deletionRequestedAt: string | null;
  actions: PrivacyActions;
}) {
  const [deletionRequestedAt, setDeletionRequestedAt] = useState(
    initialDeletionRequestedAt,
  );
  const [exporting, setExporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    setError(undefined);
    try {
      const result = await actions.exportBusiness();
      if (result.ok) {
        downloadJson(`${slug}-datos.json`, result.data);
      } else {
        setError(ajustesErrorText(result.code));
      }
    } catch {
      setError(ajustesErrorText("unknown"));
    } finally {
      setExporting(false);
    }
  }

  async function handleConfirmDeletion() {
    setError(undefined);
    const result = await actions.requestDeletion();
    if (result.ok) {
      setDeletionRequestedAt(new Date().toISOString());
      setDialogOpen(false);
    } else {
      setError(ajustesErrorText(result.code));
    }
  }

  async function handleCancelDeletion() {
    setError(undefined);
    const result = await actions.cancelDeletion();
    if (result.ok) {
      setDeletionRequestedAt(null);
    } else {
      setError(ajustesErrorText(result.code));
    }
  }

  const purgeDateLabel = deletionRequestedAt
    ? formatDate(
        new Date(
          new Date(deletionRequestedAt).getTime() +
            DELETION_GRACE_DAYS * MS_PER_DAY,
        ),
        APP_TZ,
        "dayMonthLong",
      )
    : null;

  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-5">
      <h2 className="text-18 font-bold text-ink">
        {ajustes.secciones.privacidad}
      </h2>

      <div className="flex flex-col gap-2">
        <p className="text-14 font-semibold text-ink">
          {ajustes.privacidad.exportarTitulo}
        </p>
        <p className="text-13 text-muted">{ajustes.privacidad.exportarAyuda}</p>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={exporting}
          onClick={() => void handleExport()}
          className="self-start"
        >
          {ajustes.privacidad.exportarCta}
        </Button>
      </div>

      {deletionRequestedAt ? (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-card bg-peach p-4"
        >
          <p className="text-14 font-semibold text-ink">
            {ajustes.privacidad.solicitadaAviso({
              fecha: purgeDateLabel ?? "",
            })}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="self-start"
            onClick={() => void handleCancelDeletion()}
          >
            {ajustes.privacidad.solicitadaCtaDeshacer}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-14 font-semibold text-ink">
            {ajustes.privacidad.eliminarTitulo}
          </p>
          <p className="text-13 text-muted">
            {ajustes.privacidad.eliminarAyuda}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="self-start"
            onClick={() => setDialogOpen(true)}
          >
            {ajustes.privacidad.eliminarCta}
          </Button>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-13 font-semibold text-ink">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={ajustes.privacidad.eliminarDialogTitulo}
        body={ajustes.privacidad.eliminarDialogCuerpo({
          n: DELETION_GRACE_DAYS,
        })}
        confirmLabel={ajustes.privacidad.eliminarConfirmarSi}
        cancelLabel={ajustes.privacidad.eliminarConfirmarNo}
        onConfirm={handleConfirmDeletion}
      />
    </Card>
  );
}
