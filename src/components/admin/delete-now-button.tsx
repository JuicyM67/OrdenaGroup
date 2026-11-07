"use client";

// WP-84 (D-069, port av SE WP-93): "Borrar ahora" på /admin/negocios/[id] —
// fäller ut en varning och ett fält där admin skriver företagets slug för att
// bekräfta. Servern jämför slugen igen. Lyckad radering → listan.
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { TextField } from "@/components/ui/text-field";
import { adminPanel } from "@/i18n";

import type { AdminActionResult } from "./confirm-action-button";

const t = adminPanel.borrar;

export function DeleteNowButton({
  slug,
  action,
}: {
  slug: string;
  action: (confirmSlug: string) => Promise<AdminActionResult>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const r = await action(value);
    if (r.ok) {
      router.push("/admin");
      return;
    }
    const errs = t.errores as Record<string, string>;
    setError(errs[r.code] ?? t.errores.desconocido);
    setPending(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-2 rounded-full bg-alert-bg px-4 text-13 font-bold text-alert-fg hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <Trash2 aria-hidden="true" className="size-4" strokeWidth={2} />
        {t.boton}
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="flex w-full flex-col gap-3 rounded-tile bg-alert-bg p-4"
    >
      <p className="text-14 font-bold text-alert-fg">{t.titulo}</p>
      <p className="text-13 text-ink">{t.texto}</p>
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
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || value.trim().toLowerCase() !== slug}
          className="h-10 rounded-full bg-ink px-4 text-13 font-bold text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40"
        >
          {pending ? t.borrando : t.borrar}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setValue("");
            setError(null);
          }}
          className="h-10 rounded-full px-4 text-13 font-semibold text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-ink"
        >
          {t.cancelar}
        </button>
      </div>
    </form>
  );
}
