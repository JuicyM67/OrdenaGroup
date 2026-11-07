"use client";

// Paso "Tu página" (WP-51), entre horario y "Tu link". Todo opcional
// ("Saltar este paso" reutiliza `onboarding.ctaSaltar`): omslag, logga,
// dirección e Instagram/TikTok/Facebook. A diferencia de los pasos
// anteriores, el negocio YA EXISTE cuando se muestra este paso (creado por
// `finish()` en onboarding-wizard.tsx) — por eso reutiliza directamente
// `SingleImageField` (profile-section.tsx) y `SocialHandleField`
// (booking/social-icons.tsx), los mismos componentes que Ajustes → Perfil,
// en vez de un formulario propio.
import { useState } from "react";

import {
  FacebookGlyph,
  InstagramGlyph,
  SocialHandleField,
  TiktokGlyph,
} from "@/components/booking/social-icons";
import { SingleImageField } from "@/components/settings/profile-section";
import { TextField } from "@/components/ui/text-field";
import { negocio, onboarding, perfil, redesSociales } from "@/i18n";

import { onboardingErrorText } from "./error-text";
import { StepNav } from "./step-frame";
import type { PageStepActions, WizardPageDefaults } from "./types";

export type PageStepProps = {
  /** Del paso "business" (ya guardado): se reenvía tal cual para no
   * borrarlo — `updateProfile`/`updateBusinessProfile` siempre escribe las
   * cuatro columnas (about/instagram/address/phone) juntas. */
  phone: string;
  actions: PageStepActions;
  /** WP-66: förifyllt från en import. */
  initial?: WizardPageDefaults;
  onContinue: () => void;
  onSkip: () => void;
};

export function PageStep({
  phone,
  actions,
  initial,
  onContinue,
  onSkip,
}: PageStepProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [address, setAddress] = useState(initial?.address ?? "");
  const [instagram, setInstagram] = useState(initial?.instagram ?? "");
  const [tiktok, setTiktok] = useState(initial?.tiktok ?? "");
  const [facebook, setFacebook] = useState(initial?.facebook ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleContinue() {
    if (submitting) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const result = await actions.updateProfile({
        about: initial?.about ?? "",
        instagram,
        tiktok,
        facebook,
        address,
        phone,
      });
      if (result.ok) {
        onContinue();
      } else {
        setError(onboardingErrorText(result.code));
      }
    } catch {
      setError(onboardingErrorText("unknown"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-30 leading-snug font-semibold tracking-title text-ink sm:text-34">
          {onboarding.pasos.pagina}
        </h1>
        <p className="text-15 leading-body text-muted">
          {onboarding.intro.pagina}
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-tile bg-surface p-4">
        <SingleImageField
          label={perfil.ajustes.campos.portadaLabel}
          help={perfil.ajustes.campos.portadaAyuda}
          url={coverUrl}
          kind="cover"
          actions={actions}
          onChange={setCoverUrl}
        />
        <SingleImageField
          label={perfil.ajustes.campos.logoLabel}
          help={perfil.ajustes.campos.logoAyuda}
          url={logoUrl}
          kind="logo"
          actions={actions}
          onChange={setLogoUrl}
        />
      </div>

      <TextField
        label={negocio.campos.addressLabel}
        placeholder={negocio.campos.addressPlaceholder}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        maxLength={200}
      />

      <SocialHandleField
        icon={InstagramGlyph}
        label={perfil.ajustes.campos.instagramLabel}
        placeholder={perfil.ajustes.campos.instagramPlaceholder.replace(
          /^@/,
          "",
        )}
        hint={perfil.ajustes.campos.instagramAyuda}
        value={instagram}
        onChange={(e) => setInstagram(e.target.value)}
      />

      <SocialHandleField
        icon={TiktokGlyph}
        label={redesSociales.campos.tiktokLabel}
        placeholder={redesSociales.campos.tiktokPlaceholder}
        hint={redesSociales.campos.tiktokAyuda}
        value={tiktok}
        onChange={(e) => setTiktok(e.target.value)}
      />

      <SocialHandleField
        icon={FacebookGlyph}
        label={redesSociales.campos.facebookLabel}
        placeholder={redesSociales.campos.facebookPlaceholder}
        hint={redesSociales.campos.facebookAyuda}
        value={facebook}
        onChange={(e) => setFacebook(e.target.value)}
      />

      {error ? (
        <p role="alert" className="text-13 font-semibold text-ink">
          {error}
        </p>
      ) : null}

      <StepNav
        onContinue={() => void handleContinue()}
        disabled={submitting}
        extra={
          <button
            type="button"
            disabled={submitting}
            onClick={onSkip}
            className="flex h-12 items-center rounded-full px-4 text-14 font-semibold text-ink hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40"
          >
            {onboarding.ctaSaltar}
          </button>
        }
      />
    </div>
  );
}
