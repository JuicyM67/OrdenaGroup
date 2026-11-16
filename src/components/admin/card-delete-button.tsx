"use client";

// WP-92: "Borrar" direkt på företagskortet i /admin, så att t.ex. inbjudningar
// som aldrig aktiverades kan tas bort utan att öppna företaget. Samma åtgärd
// som "Borrar ahora" på detaljsidan (`deleteNowAction`, D-069): admin skriver
// slugen och servern jämför den igen. Lyckad radering → listan laddas om.
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TextField } from "@/components/ui/text-field";
import { adminPanel } from "@/i18n";

import type { AdminActionResult } from "./confirm-action-button";

const t = adminPanel.borrar;

export function CardDeleteButton({
  name,
  slug,
  action,
}: {
  name: string;
  slug: string;
  action: (confirmSlug: string) => Promise<AdminActionResult>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    const r = await action(value);
    if (r.ok) {
      setOpen(false);
      router.refresh();
      return;
    }
    const errs = t.errores as Record<string, string>;
    setError(errs[r.code] ?? t.errores.desconocido);
  }

  return (
    <>
      <IconButton
        label={adminPanel.lista.borrarNegocio({ nombre: name })}
        tone="canvas"
        size={36}
        className="hover:bg-alert-bg hover:text-alert-fg"
        onClick={() => setOpen(true)}
      >
        <Trash2 aria-hidden="true" className="size-4" strokeWidth={2} />
      </IconButton>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setValue("");
            setError(null);
          }
        }}
        title={`${t.titulo}: ${name}`}
        body={t.texto}
        confirmLabel={t.borrar}
        cancelLabel={t.cancelar}
        confirmDisabled={value.trim().toLowerCase() !== slug}
        onConfirm={handleConfirm}
      >
        <TextField
          label={t.confirmar({ slug })}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          autoFocus
        />
        {error ? (
          <p role="alert" className="text-13 font-semibold text-alert-fg">
            {error}
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
