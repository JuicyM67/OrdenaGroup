"use client";

import { useRouter } from "next/navigation";

// Sección "Te echamos de menos (automático)" (WP-31, F14, Ajustes → Socios y
// envíos): `businesses.winback_days`/`winback_message`/`winback_offer_pct`/
// `winback_offer_days`. Mismo formmönster som `MemberSection` (eget kort,
// egen "Guardar cambios") — las dos secciones conviven en la misma pestaña
// (`/app/ajustes/socios/page.tsx`).
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TextField } from "@/components/ui/text-field";
import { ajustes } from "@/i18n";

import { ajustesErrorText } from "./error-text";
import type { AjustesActions, AjustesBusiness } from "./types";

type FormState = {
  enabled: boolean;
  days: string;
  message: string;
  offerPct: string;
  offerDays: string;
};

function toFormState(b: AjustesBusiness): FormState {
  return {
    enabled: b.winbackDays !== null,
    days: b.winbackDays === null ? "" : String(b.winbackDays),
    message: b.winbackMessage ?? "",
    offerPct: b.winbackOfferPct === null ? "" : String(b.winbackOfferPct),
    offerDays: b.winbackOfferDays === null ? "" : String(b.winbackOfferDays),
  };
}

export function WinbackSection({
  business,
  onSaved,
  action,
}: {
  business: AjustesBusiness;
  /** Utan onSaved laddas sidan om. */
  onSaved?: (business: AjustesBusiness) => void;
  action: AjustesActions["updateWinbackSettings"];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => toFormState(business));
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(undefined);
    try {
      const result = await action({
        enabled: form.enabled,
        days: form.days ? Number(form.days) : undefined,
        message: form.message,
        offerPct: form.offerPct ? Number(form.offerPct) : undefined,
        offerDays: form.offerDays ? Number(form.offerDays) : undefined,
      });
      if (result.ok) {
        setStatus("saved");
        (onSaved ?? (() => router.refresh()))({
          ...business,
          winbackDays: form.enabled && form.days ? Number(form.days) : null,
          winbackMessage:
            form.enabled && form.message.trim() ? form.message.trim() : null,
          winbackOfferPct:
            form.enabled && form.offerPct ? Number(form.offerPct) : null,
          winbackOfferDays:
            form.enabled && form.offerDays ? Number(form.offerDays) : null,
        });
      } else {
        setStatus("error");
        setError(ajustesErrorText(result.code));
      }
    } catch {
      setStatus("error");
      setError(ajustesErrorText("unknown"));
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-6"
    >
      <Card radius="tile" padding="lg" className="flex flex-col gap-4">
        <h2 className="text-18 font-bold text-ink">
          {ajustes.winback.titulo}
        </h2>

        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-14 font-semibold text-ink">
              {ajustes.winback.activar}
            </p>
            <p className="mt-0.5 text-12 text-muted">
              {ajustes.winback.activarAyuda}
            </p>
          </div>
          <Switch
            checked={form.enabled}
            onChange={(checked) => set("enabled", checked)}
            label={ajustes.winback.activar}
          />
        </div>

        {form.enabled ? (
          <>
            <TextField
              label={ajustes.winback.diasLabel}
              hint={ajustes.winback.diasAyuda}
              type="number"
              inputMode="numeric"
              min={30}
              max={365}
              value={form.days}
              onChange={(e) => set("days", e.target.value)}
              required
            />
            <Textarea
              label={ajustes.winback.mensajeLabel}
              hint={ajustes.winback.mensajeAyuda}
              placeholder={ajustes.winback.mensajePlaceholder}
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              maxLength={320}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label={ajustes.winback.ofertaPctLabel}
                hint={ajustes.winback.ofertaPctAyuda}
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={form.offerPct}
                onChange={(e) => set("offerPct", e.target.value)}
              />
              <TextField
                label={ajustes.winback.ofertaDiasLabel}
                hint={ajustes.winback.ofertaDiasAyuda}
                type="number"
                inputMode="numeric"
                min={1}
                max={90}
                value={form.offerDays}
                onChange={(e) => set("offerDays", e.target.value)}
              />
            </div>
          </>
        ) : null}
      </Card>

      {error ? (
        <p role="alert" className="text-13 font-semibold text-ink">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" size="xl" disabled={status === "saving"}>
          {status === "saving" ? ajustes.guardando : ajustes.guardarCambios}
        </Button>
        {status === "saved" ? (
          <span role="status" className="text-13 text-muted">
            {ajustes.cambiosGuardados}
          </span>
        ) : null}
      </div>
    </form>
  );
}
