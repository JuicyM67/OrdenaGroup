"use client";

// Paso 0 (sin numerar, ver el comentario de onboarding-wizard.tsx): datos del negocio +
// link. `negocio.*` (src/i18n/es-CL.ts) — "onboarding paso 1 y Ajustes".
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { TextField } from "@/components/ui/text-field";
import { negocio, onboarding } from "@/i18n";

import {
  slugify,
  validatePhone,
  validateRequired,
  validateSlug,
} from "./client-validation";
import { onboardingErrorText } from "./error-text";
import type { WizardBusiness } from "./types";

const RUBROS = Object.entries(negocio.rubros) as [string, string][];

export type BusinessStepProps = {
  value: WizardBusiness;
  onChange: (value: WizardBusiness) => void;
  onContinue: () => void;
};

type Errors = Partial<
  Record<"name" | "slug" | "comuna" | "phone" | "category", string>
>;

export function BusinessStep({
  value,
  onChange,
  onContinue,
}: BusinessStepProps) {
  const [errors, setErrors] = useState<Errors>({});

  function setName(name: string) {
    onChange({
      ...value,
      name,
      slug: value.slugTouched ? value.slug : slugify(name),
    });
  }

  function setSlug(slug: string) {
    onChange({ ...value, slug, slugTouched: true });
  }

  function handleContinue() {
    const name = validateRequired(value.name, "business.name_empty");
    const slug = validateSlug(value.slug);
    const comuna = validateRequired(value.comuna, "business.comuna_empty");
    const phone = validatePhone(value.phone);
    const next: Errors = {};
    if (!name.ok) next.name = onboardingErrorText(name.code);
    if (!slug.ok) next.slug = onboardingErrorText(slug.code);
    if (!comuna.ok) next.comuna = onboardingErrorText(comuna.code);
    if (!phone.ok) next.phone = onboardingErrorText(phone.code);
    if (value.category === "") {
      next.category = onboardingErrorText("business.category_invalid");
    }
    setErrors(next);
    if (Object.keys(next).length === 0) onContinue();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-22 font-bold tracking-title text-ink">
          {negocio.campos.nameLabel}
        </h1>
        <p className="text-13 text-muted">{onboarding.bienvenida}</p>
      </div>

      <TextField
        label={negocio.campos.nameLabel}
        placeholder={negocio.campos.namePlaceholder}
        value={value.name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        maxLength={120}
      />

      <TextField
        label={negocio.slug.label}
        hint={errors.slug ? undefined : negocio.slug.ayuda}
        value={value.slug}
        onChange={(e) => setSlug(e.target.value)}
        error={errors.slug}
        maxLength={40}
      />
      {value.slug ? (
        <p className="-mt-3 text-13 text-muted">
          {negocio.slug.vistaPrevia({ url: `/${value.slug}` })}
        </p>
      ) : null}

      <TextField
        label={negocio.campos.comunaLabel}
        value={value.comuna}
        onChange={(e) => onChange({ ...value, comuna: e.target.value })}
        error={errors.comuna}
        maxLength={80}
      />

      <div className="flex flex-col gap-2">
        <span className="text-13 font-semibold text-ink">
          {negocio.campos.categoryLabel}
        </span>
        <div className="flex flex-wrap gap-2">
          {RUBROS.map(([key, label]) => (
            <Pill
              key={key}
              selected={value.category === key}
              onClick={() => onChange({ ...value, category: key })}
            >
              {label}
            </Pill>
          ))}
        </div>
        {errors.category ? (
          <span className="text-13 text-ink">{errors.category}</span>
        ) : null}
      </div>

      <TextField
        label={negocio.campos.phoneLabel}
        hint={errors.phone ? undefined : negocio.campos.phoneAyuda}
        placeholder={negocio.campos.phonePlaceholder}
        value={value.phone}
        onChange={(e) => onChange({ ...value, phone: e.target.value })}
        error={errors.phone}
      />

      <Button type="button" size="xl" onClick={handleContinue}>
        {onboarding.ctaContinuar}
      </Button>
    </div>
  );
}
