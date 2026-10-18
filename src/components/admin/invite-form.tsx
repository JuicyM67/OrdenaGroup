"use client";

// "Nytt företag": bjuder in någon via e-post (F19/WP-36). Svensk text.
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Textarea } from "@/components/ui/textarea";
import { BILLING_NOTE_MAX } from "@/config/billing-mode";
import { adminPanel } from "@/i18n";
import type {
  InviteBusinessInput,
  InviteBusinessResult,
} from "@/app/(admin)/admin/nuevo/actions";

import { BillingModeCheckbox } from "./billing-form";

const PLANS = ["free", "emprende", "equipo", "local"] as const;

export type InviteFormProps = {
  onSubmit: (input: InviteBusinessInput) => Promise<InviteBusinessResult>;
};

export function InviteForm({ onSubmit }: InviteFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [plan, setPlan] = useState<InviteBusinessInput["plan"]>("free");
  const [until, setUntil] = useState("");
  // WP-80 (D-061): av som standard, men tydligt synlig.
  const [manual, setManual] = useState(false);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

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
    setPending(false);
    if (result.ok) {
      setDone(true);
      router.refresh();
    } else {
      setError(result.code);
    }
  }

  if (done) {
    return (
      <p className="text-14 text-ink">
        Inbjudan skickad till {email}.{" "}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setDone(false);
            setEmail("");
            setBusinessName("");
            setUntil("");
            setManual(false);
            setNote("");
          }}
        >
          Bjud in en till
        </Button>
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-4"
    >
      <TextField
        label="Företagets namn"
        required
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
      />
      <TextField
        label="Ägarens e-post"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label className="flex flex-col gap-1 text-13 text-ink">
        Plan
        <select
          value={plan}
          onChange={(e) =>
            setPlan(e.target.value as InviteBusinessInput["plan"])
          }
          className="h-10 rounded-control border border-border bg-surface px-3 text-14 text-ink"
        >
          {PLANS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-13 text-ink">
        Gratis/override till (valfritt)
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
        <p className="text-13 text-alert">Det gick inte ({error}).</p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Skickar…" : "Skicka inbjudan"}
      </Button>
    </form>
  );
}
