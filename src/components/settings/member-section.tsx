"use client";

// Sección "Socios" (WP-54, Ajustes): förmånen för kunder markerade som
// `customers.is_member` — av/på + rabatt i % + valfri text. Samma
// formmönster som `BusinessSection` (eget kort, egen "Guardar cambios").
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
  discountPct: string;
  benefitText: string;
};

function toFormState(b: AjustesBusiness): FormState {
  return {
    enabled: b.memberDiscountPct !== null,
    discountPct:
      b.memberDiscountPct === null ? "" : String(b.memberDiscountPct),
    benefitText: b.memberBenefitText ?? "",
  };
}

export function MemberSection({
  business,
  onSaved,
  action,
}: {
  business: AjustesBusiness;
  onSaved: (business: AjustesBusiness) => void;
  action: AjustesActions["updateMemberSettings"];
}) {
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
        discountPct: form.discountPct ? Number(form.discountPct) : undefined,
        benefitText: form.benefitText,
      });
      if (result.ok) {
        setStatus("saved");
        onSaved({
          ...business,
          memberDiscountPct: form.enabled ? Number(form.discountPct) : null,
          memberBenefitText:
            form.enabled && form.benefitText.trim()
              ? form.benefitText.trim()
              : null,
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
          {ajustes.secciones.socios}
        </h2>

        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-14 font-semibold text-ink">
              {ajustes.socios.activar}
            </p>
            <p className="mt-0.5 text-12 text-muted">
              {ajustes.socios.activarAyuda}
            </p>
          </div>
          <Switch
            checked={form.enabled}
            onChange={(checked) => set("enabled", checked)}
            label={ajustes.socios.activar}
          />
        </div>

        {form.enabled ? (
          <>
            <TextField
              label={ajustes.socios.descuentoLabel}
              hint={ajustes.socios.descuentoAyuda}
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              value={form.discountPct}
              onChange={(e) => set("discountPct", e.target.value)}
              required
            />
            <Textarea
              label={ajustes.socios.beneficioLabel}
              hint={ajustes.socios.beneficioAyuda}
              placeholder={ajustes.socios.beneficioPlaceholder}
              value={form.benefitText}
              onChange={(e) => set("benefitText", e.target.value)}
              maxLength={140}
            />
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
