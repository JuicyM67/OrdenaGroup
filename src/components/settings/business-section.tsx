"use client";

// Sección "Tu negocio" (WP-15b slim → WP-55: separada de "Reglas de reserva", ver
// `booking-rules-section.tsx`, ahora cada una en su propia pestaña de Ajustes). Mismos
// campos y mismas reglas de slug que onboarding (business-step.tsx), reutilizando sus
// validadores de cliente. Las dos secciones siguen escribiendo en la misma fila de
// `businesses` (mismo `action`) — esta solo edita/envía los campos de "Tu negocio";
// los campos de reglas viajan sin cambios desde `business` (ver `handleSubmit`).
import { useState } from "react";

import {
  validatePhone,
  validateRequired,
  validateSlug,
} from "@/components/onboarding/client-validation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { ajustes, negocio } from "@/i18n";

import { ajustesErrorText } from "./error-text";
import type { AjustesActions, AjustesBusiness } from "./types";

type FormState = {
  name: string;
  slug: string;
  comuna: string;
  phone: string;
  address: string;
};

function toFormState(b: AjustesBusiness): FormState {
  return {
    name: b.name,
    slug: b.slug,
    comuna: b.comuna,
    phone: b.phone,
    address: b.address,
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
        // "Reglas de reserva" vive en su propia pestaña (booking-rules-section.tsx) pero
        // `updateBusinessSettings` escribe la fila entera: viajan sin cambios.
        minNoticeMinutes: business.minNoticeMinutes,
        maxDaysAhead: business.maxDaysAhead,
        cancelWindowHours: business.cancelWindowHours,
        slotIntervalMinutes: business.slotIntervalMinutes,
        autoConfirmBookings: business.autoConfirmBookings,
      });
      if (result.ok) {
        setStatus("saved");
        onSaved({
          ...business,
          name: form.name,
          slug: form.slug.trim().toLowerCase(),
          comuna: form.comuna,
          phone: form.phone,
          address: form.address,
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
