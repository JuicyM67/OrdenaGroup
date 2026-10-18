"use client";

// WP-80 (D-061): "Facturación manual" + intern anteckning på
// /admin/negocios/[id].
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { BILLING_NOTE_MAX } from "@/config/billing-mode";
import { Textarea } from "@/components/ui/textarea";
import { adminPanel } from "@/i18n";

import { billingErrorText } from "./admin-error-text";
import type { AdminActionResult } from "./confirm-action-button";

const t = adminPanel.facturacion;

export type BillingFormProps = {
  billingMode: "app" | "manual";
  billingNote: string | null;
  onSubmit: (
    mode: "app" | "manual",
    note: string | null,
  ) => Promise<AdminActionResult>;
};

export function BillingForm({
  billingMode,
  billingNote,
  onSubmit,
}: BillingFormProps) {
  const router = useRouter();
  const [manual, setManual] = useState(billingMode === "manual");
  const [note, setNote] = useState(billingNote ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const result = await onSubmit(
      manual ? "manual" : "app",
      note.trim() ? note : null,
    );
    setPending(false);
    if (result.ok) {
      setMessage(t.guardado);
      router.refresh();
    } else {
      setMessage(billingErrorText(result.code));
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-3"
    >
      <BillingModeCheckbox checked={manual} onChange={setManual} />
      <Textarea
        label={t.nota}
        hint={t.notaAyuda({ max: BILLING_NOTE_MAX })}
        maxLength={BILLING_NOTE_MAX}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t.guardando : t.guardar}
        </Button>
        {message ? (
          <span role="status" className="text-13 text-ink-soft">
            {message}
          </span>
        ) : null}
      </div>
    </form>
  );
}

/** Kryssrutan + hjälptext, delad med inbjudningsformuläret. */
export function BillingModeCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-control border border-border p-3 text-14 text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-ink"
      />
      <span className="flex flex-col gap-1">
        <span className="font-bold">{t.manual}</span>
        <span className="text-13 text-ink-soft">{t.manualAyuda}</span>
      </span>
    </label>
  );
}
