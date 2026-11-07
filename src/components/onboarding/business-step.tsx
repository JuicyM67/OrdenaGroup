"use client";

// Företagsuppgifterna i onboarding (WP-92): tre korta steg i stället för ett långt
// formulär — namn + bokningslänk, bransch (rutor med ikon, samma toner som Descubre)
// och plats + kontakt. Samma fält, validering och data (`WizardBusiness`) som förut;
// allt sparas fortfarande i ett enda anrop efter Öppettider.
import { Check } from "lucide-react";
import { useState } from "react";

import { CATEGORY_UI } from "@/components/marketplace/categories";
import { cn } from "@/components/ui/cn";
import { TextField } from "@/components/ui/text-field";
import { categoryForRubro } from "@/config/marketplace";
import { negocio, onboarding } from "@/i18n";

import {
  slugify,
  validatePhone,
  validateRequired,
  validateSlug,
} from "./client-validation";
import { onboardingErrorText } from "./error-text";
import { StepHeader, StepNav } from "./step-frame";
import type { WizardBusiness } from "./types";

const RUBROS = Object.entries(negocio.rubros) as [string, string][];

export type BusinessStepProps = {
  value: WizardBusiness;
  onChange: (value: WizardBusiness) => void;
  onContinue: () => void;
  onBack?: () => void;
};

/** Steg "Företaget": namn och bokningslänk med förhandsvisning. */
export function BusinessNameStep({
  value,
  onChange,
  onContinue,
  onBack,
}: BusinessStepProps) {
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({});

  function next() {
    const name = validateRequired(value.name, "business.name_empty");
    const slug = validateSlug(value.slug);
    const e: { name?: string; slug?: string } = {};
    if (!name.ok) e.name = onboardingErrorText(name.code);
    if (!slug.ok) e.slug = onboardingErrorText(slug.code);
    setErrors(e);
    if (!e.name && !e.slug) onContinue();
  }

  return (
    <div className="flex flex-col gap-5">
      <StepHeader
        title={onboarding.negocioPaso.titulo}
        text={onboarding.negocioPaso.texto}
      />
      <TextField
        label={negocio.campos.nameLabel}
        placeholder={negocio.campos.namePlaceholder}
        value={value.name}
        onChange={(e) =>
          onChange({
            ...value,
            name: e.target.value,
            slug: value.slugTouched ? value.slug : slugify(e.target.value),
          })
        }
        error={errors.name}
        maxLength={120}
        autoFocus
      />
      <TextField
        label={negocio.slug.label}
        hint={errors.slug ? undefined : negocio.slug.ayuda}
        value={value.slug}
        onChange={(e) =>
          onChange({ ...value, slug: e.target.value, slugTouched: true })
        }
        error={errors.slug}
        maxLength={40}
      />
      <div className="flex items-center gap-3 rounded-tile bg-canvas px-4 py-3.5">
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-full bg-lime ring-2 ring-ink/10"
        />
        <span className="flex min-w-0 flex-col">
          <span className="text-12 text-muted">
            {onboarding.negocioPaso.vistaPrevia}
          </span>
          <span className="truncate text-15 font-semibold text-ink">
            {negocio.slug.vistaPrevia({ url: `/${value.slug || "…"}` })}
          </span>
        </span>
      </div>
      <StepNav onBack={onBack} onContinue={next} />
    </div>
  );
}

/** Steg "Bransch": rutor med kategorins ikon och ton. */
export function BusinessCategoryStep({
  value,
  onChange,
  onContinue,
  onBack,
}: BusinessStepProps) {
  const [error, setError] = useState<string | undefined>();

  function next() {
    if (value.category === "") {
      setError(onboardingErrorText("business.category_invalid"));
      return;
    }
    onContinue();
  }

  return (
    <div className="flex flex-col gap-5">
      <StepHeader
        title={onboarding.rubroPaso.titulo}
        text={onboarding.rubroPaso.texto}
      />
      <div
        role="radiogroup"
        aria-label={negocio.campos.categoryLabel}
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4"
      >
        {RUBROS.map(([key, label]) => {
          const ui = CATEGORY_UI[categoryForRubro(key)];
          const on = value.category === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                onChange({ ...value, category: key });
                setError(undefined);
              }}
              className={cn(
                "relative flex min-h-24 flex-col items-start justify-between gap-2 rounded-tile p-3.5 text-left text-14 font-bold text-ink transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                ui.tone,
                on && "ring-2 ring-ink ring-offset-2 ring-offset-surface",
              )}
            >
              <span
                aria-hidden="true"
                className="flex size-9 items-center justify-center rounded-full bg-surface/70"
              >
                <ui.icon className="size-4.5" strokeWidth={2} />
              </span>
              {label}
              {on ? (
                <span
                  aria-hidden="true"
                  className="absolute top-2.5 right-2.5 flex size-6 items-center justify-center rounded-full bg-ink text-lime"
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="text-13 font-semibold text-ink">
          {error}
        </p>
      ) : null}
      <StepNav onBack={onBack} onContinue={next} />
    </div>
  );
}

/** Steg "Plats och kontakt": comuna och telefon. */
export function BusinessPlaceStep({
  value,
  onChange,
  onContinue,
  onBack,
}: BusinessStepProps) {
  const [errors, setErrors] = useState<{
    comuna?: string;
    phone?: string;
    address?: string;
  }>({});

  function next() {
    const comuna = validateRequired(value.comuna, "business.comuna_empty");
    const phone = validatePhone(value.phone);
    const e: { comuna?: string; phone?: string; address?: string } = {};
    if (!comuna.ok) e.comuna = onboardingErrorText(comuna.code);
    if (!phone.ok) e.phone = onboardingErrorText(phone.code);
    // WP-85 (D-070): adress krävs utom för den som kommer till kunden.
    if (!value.servesAtCustomer) {
      const address = validateRequired(value.address, "business.address_empty");
      if (!address.ok) e.address = onboardingErrorText(address.code);
    }
    setErrors(e);
    if (!e.comuna && !e.phone && !e.address) onContinue();
  }

  return (
    <div className="flex flex-col gap-5">
      <StepHeader
        title={onboarding.lugarPaso.titulo}
        text={onboarding.lugarPaso.texto}
      />
      <TextField
        label={negocio.campos.comunaLabel}
        value={value.comuna}
        onChange={(e) => onChange({ ...value, comuna: e.target.value })}
        error={errors.comuna}
        maxLength={80}
        autoComplete="address-level2"
      />
      <div className="flex flex-col gap-3">
        {value.servesAtCustomer ? null : (
          <TextField
            label={negocio.campos.addressLabel}
            hint={errors.address ? undefined : negocio.campos.addressAyuda}
            placeholder={negocio.campos.addressPlaceholder}
            value={value.address}
            onChange={(e) => onChange({ ...value, address: e.target.value })}
            error={errors.address}
            maxLength={200}
            autoComplete="street-address"
          />
        )}
        <label className="flex cursor-pointer items-start gap-3 text-14 text-ink">
          <input
            type="checkbox"
            checked={value.servesAtCustomer}
            onChange={(e) =>
              onChange({ ...value, servesAtCustomer: e.target.checked })
            }
            className="mt-0.5 size-5 shrink-0 accent-ink"
          />
          <span className="flex flex-col gap-0.5">
            <span className="font-semibold">{negocio.campos.sinLocal}</span>
            <span className="text-13 text-muted">
              {negocio.campos.sinLocalAyuda}
            </span>
          </span>
        </label>
      </div>
      <TextField
        label={negocio.campos.phoneLabel}
        hint={errors.phone ? undefined : negocio.campos.phoneAyuda}
        placeholder={negocio.campos.phonePlaceholder}
        value={value.phone}
        onChange={(e) => onChange({ ...value, phone: e.target.value })}
        error={errors.phone}
        autoComplete="tel"
      />
      <StepNav onBack={onBack} onContinue={next} />
    </div>
  );
}
