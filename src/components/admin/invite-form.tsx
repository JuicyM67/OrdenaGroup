"use client";

// "Nuevo negocio": bjuder in någon via e-post (F19/WP-36). Text via
// `adminPanel.invitar`.
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Textarea } from "@/components/ui/textarea";
import { BILLING_NOTE_MAX } from "@/config/billing-mode";
import { adminPanel, planes } from "@/i18n";
import type {
  InviteBusinessInput,
  InviteBusinessResult,
} from "@/app/(admin)/admin/nuevo/actions";

import { actionErrorText } from "./admin-error-text";
import { BillingModeCheckbox } from "./billing-form";

const t = adminPanel.invitar;

const PLANS = ["free", "emprende", "equipo", "local"] as const;

export type InviteFormProps = {
  onSubmit: (input: InviteBusinessInput) => Promise<InviteBusinessResult>;
};

export function InviteForm({ onSubmit }: InviteFormProps) {
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [plan, setPlan] = useState<InviteBusinessInput["plan"]>("free");
  const [until, setUntil] = useState("");
  // WP-80 (D-061): av som standard, men tydligt synlig.
  const [manual, setManual] = useState(false);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await onSubmit({
      email,
      businessName,
      plan,
      planOverrideUntil: until
        ? new Date(`${until}T00:00:00.000Z`).toISOString()
        : null,
      billingMode: manual ? "manual" : "app",
      billingNote: note.trim() ? note : null,
    });
    if (result.ok) {
      // WP-93 (D-078): företaget finns redan — admin landar i det och kan
      // öppna det som soporte eller skicka om inbjudan därifrån. Full
      // sidladdning: en klientnavigering direkt efter server-actionen gav
      // "No se pudo cargar la página" i drift (2026-11-17).
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- medvetet full sidladdning, se ovan
      window.location.assign(`/admin/negocios/${result.businessId}`);
    } else {
      setPending(false);
      setError(result.code);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-4"
    >
      <TextField
        label={t.nombre}
        required
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
      />
      <TextField
        label={t.correo}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label className="flex flex-col gap-1 text-13 text-ink">
        {t.plan}
        <select
          value={plan}
          onChange={(e) =>
            setPlan(e.target.value as InviteBusinessInput["plan"])
          }
          className="h-10 rounded-control border border-border bg-surface px-3 text-14 text-ink"
        >
          {PLANS.map((p) => (
            <option key={p} value={p}>
              {planes.nombres[p]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-13 text-ink">
        {t.hasta}
        <input
          type="date"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          className="h-10 rounded-control border border-border bg-surface px-3 text-14 text-ink"
        />
      </label>
      <BillingModeCheckbox checked={manual} onChange={setManual} />
      {manual ? (
        <Textarea
          label={adminPanel.facturacion.nota}
          hint={adminPanel.facturacion.notaAyuda({ max: BILLING_NOTE_MAX })}
          maxLength={BILLING_NOTE_MAX}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      ) : null}
      {error ? (
        <p className="text-13 text-alert">{actionErrorText(error)}</p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t.enviando : t.enviar}
      </Button>
    </form>
  );
}
