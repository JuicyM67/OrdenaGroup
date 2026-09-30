"use client";

// Sección "Tu negocio" + "Reglas de reserva" (WP-15b slim, ver plan). Mismos campos y
// mismas reglas de slug que onboarding (business-step.tsx), reutilizando sus validadores
// de cliente. Un solo formulario, un solo botón "Guardar cambios": las dos secciones
// escriben en la misma fila de `businesses`.
import { useState } from "react";

import {
  validatePhone,
  validateRequired,
  validateSlug,
} from "@/components/onboarding/client-validation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { ajustes, negocio } from "@/i18n";

import { ajustesErrorText } from "./error-text";
import type { AjustesActions, AjustesBusiness } from "./types";

const SLOT_INTERVALS = [5, 10, 15, 20, 30, 60] as const;

type FormState = {
  name: string;
  slug: string;
  comuna: string;
  phone: string;
  address: string;
  minNoticeMinutes: string;
  maxDaysAhead: string;
  cancelWindowHours: string;
  slotIntervalMinutes: string;
  autoConfirmBookings: boolean;
};

function toFormState(b: AjustesBusiness): FormState {
  return {
    name: b.name,
    slug: b.slug,
    comuna: b.comuna,
    phone: b.phone,
    address: b.address,
    minNoticeMinutes: String(b.minNoticeMinutes),
    maxDaysAhead: String(b.maxDaysAhead),
    cancelWindowHours: String(b.cancelWindowHours),
    slotIntervalMinutes: String(b.slotIntervalMinutes),
    autoConfirmBookings: b.autoConfirmBookings,
  };
}

type Errors = Partial<Record<"name" | "slug" | "comuna" | "phone", string>>;

export function BusinessSection({
  business,
  onSaved,
  action,
}: {
  business: AjustesBusiness;
  onSaved: (business: AjustesBusiness) => void;
  action: AjustesActions["updateBusinessSettings"];
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(business));
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [submitError, setSubmitError] = useState<string | undefined>();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = validateRequired(form.name, "business.name_empty");
    const slug = validateSlug(form.slug);
    const comuna = validateRequired(form.comuna, "business.comuna_empty");
    const phone = validatePhone(form.phone);
    const next: Errors = {};
    if (!name.ok) next.name = ajustesErrorText(name.code);
    if (!slug.ok) next.slug = ajustesErrorText(slug.code);
    if (!comuna.ok) next.comuna = ajustesErrorText(comuna.code);
    if (!phone.ok) next.phone = ajustesErrorText(phone.code);
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setStatus("saving");
    setSubmitError(undefined);
    try {
      const result = await action({
        name: form.name,
        slug: form.slug.trim().toLowerCase(),
        comuna: form.comuna,
        phone: form.phone,
        address: form.address,
        minNoticeMinutes: Number(form.minNoticeMinutes),
        maxDaysAhead: Number(form.maxDaysAhead),
        cancelWindowHours: Number(form.cancelWindowHours),
        slotIntervalMinutes: Number(form.slotIntervalMinutes),
        autoConfirmBookings: form.autoConfirmBookings,
      });
      if (result.ok) {
        setStatus("saved");
        onSaved({
          name: form.name,
          slug: form.slug.trim().toLowerCase(),
          comuna: form.comuna,
          phone: form.phone,
          address: form.address,
          minNoticeMinutes: Number(form.minNoticeMinutes),
          maxDaysAhead: Number(form.maxDaysAhead),
          cancelWindowHours: Number(form.cancelWindowHours),
          slotIntervalMinutes: Number(form.slotIntervalMinutes),
          autoConfirmBookings: form.autoConfirmBookings,
        });
      } else {
        setStatus("error");
        setSubmitError(ajustesErrorText(result.code));
      }
    } catch {
      setStatus("error");
      setSubmitError(ajustesErrorText("unknown"));
    }
  }

  const slugChanged = form.slug.trim().toLowerCase() !== business.slug;
  const maxDaysAheadN = Number(form.maxDaysAhead) || 0;

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-6"
    >
      <Card radius="tile" padding="lg" className="flex flex-col gap-4">
        <h2 className="text-18 font-bold text-ink">
          {ajustes.secciones.negocio}
        </h2>

        <TextField
          label={negocio.campos.nameLabel}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          error={errors.name}
          maxLength={120}
        />

        <TextField
          label={negocio.slug.label}
          hint={
            errors.slug
              ? undefined
              : slugChanged
                ? ajustes.slugAviso
                : negocio.slug.ayuda
          }
          value={form.slug}
          onChange={(e) => set("slug", e.target.value)}
          error={errors.slug}
          maxLength={40}
        />
        {form.slug ? (
          <p className="-mt-3 text-13 text-muted">
            {negocio.slug.vistaPrevia({ url: `/${form.slug}` })}
          </p>
        ) : null}

        <TextField
          label={negocio.campos.comunaLabel}
          value={form.comuna}
          onChange={(e) => set("comuna", e.target.value)}
          error={errors.comuna}
          maxLength={80}
        />

        <TextField
          label={negocio.campos.phoneLabel}
          hint={errors.phone ? undefined : negocio.campos.phoneAyuda}
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          error={errors.phone}
        />

        <TextField
          label={negocio.campos.addressLabel}
          placeholder={negocio.campos.addressPlaceholder}
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          maxLength={200}
        />
      </Card>

      <Card radius="tile" padding="lg" className="flex flex-col gap-4">
        <h2 className="text-18 font-bold text-ink">
          {ajustes.secciones.reglas}
        </h2>

        <TextField
          label={ajustes.reglas.minNoticeLabel}
          type="number"
          inputMode="numeric"
          min={0}
          max={10080}
          value={form.minNoticeMinutes}
          onChange={(e) => set("minNoticeMinutes", e.target.value)}
          required
        />

        <TextField
          label={ajustes.reglas.maxDaysAheadLabel({ n: maxDaysAheadN })}
          type="number"
          inputMode="numeric"
          min={1}
          max={365}
          value={form.maxDaysAhead}
          onChange={(e) => set("maxDaysAhead", e.target.value)}
          required
        />

        <TextField
          label={ajustes.reglas.cancelWindowLabel}
          hint={ajustes.reglas.cancelWindowAyuda}
          type="number"
          inputMode="numeric"
          min={0}
          max={168}
          value={form.cancelWindowHours}
          onChange={(e) => set("cancelWindowHours", e.target.value)}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="slot-interval"
            className="text-13 font-semibold text-ink"
          >
            {ajustes.reglas.slotIntervalLabel}
          </label>
          <select
            id="slot-interval"
            value={form.slotIntervalMinutes}
            onChange={(e) => set("slotIntervalMinutes", e.target.value)}
            className="h-13 w-full rounded-control border-2 border-transparent bg-field px-4 text-15 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {SLOT_INTERVALS.map((n) => (
              <option key={n} value={n}>
                {n} min
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 border-t border-line-strong pt-4">
          <div className="min-w-0 flex-1">
            <p className="text-14 font-semibold text-ink">
              {ajustes.reglas.confirmarAutomatico}
            </p>
            <p className="mt-0.5 text-12 text-muted">
              {ajustes.reglas.confirmarAutomaticoAyuda}
            </p>
          </div>
          <Switch
            checked={form.autoConfirmBookings}
            onChange={(checked) => set("autoConfirmBookings", checked)}
            label={ajustes.reglas.confirmarAutomatico}
          />
        </div>
      </Card>

      {submitError ? (
        <p role="alert" className="text-13 font-semibold text-ink">
          {submitError}
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
