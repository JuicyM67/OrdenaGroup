"use client";

// WP-80 (D-061): "Quitar" en /admin/administradores, med bekräftelse.
import { adminPanel } from "@/i18n";

import {
  ConfirmActionButton,
  type AdminActionResult,
} from "./confirm-action-button";
import { adminErrorText } from "./admin-error-text";

const t = adminPanel.administradores;

export function RemoveAdminButton({
  action,
}: {
  action: () => Promise<AdminActionResult>;
}) {
  return (
    <ConfirmActionButton
      label={t.quitar}
      title={t.quitarTitulo}
      body={t.quitarTexto}
      confirmLabel={t.quitar}
      cancelLabel={t.cancelar}
      action={action}
      errorText={adminErrorText}
    />
  );
}
