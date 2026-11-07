"use client";

// WP-87 (D-073): "Anular" en försäljning i salongen (samma dag, oanvänd
// tarjeta). Servern avgör om det går; felet visas under raden.
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { comun, regalo } from "@/i18n";

const t = regalo.caja;

export function VoidGiftCardButton({
  giftCardId,
  action,
}: {
  giftCardId: string;
  action: (
    giftCardId: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-13 font-bold text-ink underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {t.anular}
      </button>
      {error ? (
        <p role="alert" className="basis-full text-13 text-alert-fg">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t.anularTitulo}
        body={t.anularTexto}
        confirmLabel={t.anular}
        cancelLabel={comun.cerrar}
        onConfirm={async () => {
          const r = await action(giftCardId);
          setOpen(false);
          if (r.ok) {
            setError(null);
            router.refresh();
          } else {
            setError(r.message);
          }
        }}
      />
    </>
  );
}
