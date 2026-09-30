"use client";

// Bannern "Förslag för {bransch}" (`falt-A-bokningsformular.html`, WP-40 steg
// 6, D-031): visar branschens förslag och låter ägaren slå på/av var och en.
// En redan skapad fråga med samma `preset_key` aktiveras/avaktiveras i
// stället för att skapas på nytt (samma regel som `activatePreset`,
// `src/server/owner/booking-questions.ts`).
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { formulario } from "@/i18n";

import {
  industryLabel,
  presetsForIndustry,
  type BookingQuestionIndustry,
} from "./booking-form-industry";
import { bookingFormErrorText } from "./booking-form-error-text";
import type {
  BookingFormQuestion,
  CreateResult,
  MutationResult,
} from "./booking-form-types";

export type BookingSuggestionsBannerProps = {
  industry: BookingQuestionIndustry;
  questions: BookingFormQuestion[];
  onActivate: (presetKey: string) => Promise<CreateResult>;
  onDeactivate: (questionId: string) => Promise<MutationResult>;
};

export function BookingSuggestionsBanner({
  industry,
  questions,
  onActivate,
  onDeactivate,
}: BookingSuggestionsBannerProps) {
  const [open, setOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const presets = presetsForIndustry(industry);

  async function toggle(
    presetKey: string,
    existing: BookingFormQuestion | undefined,
  ) {
    setPendingKey(presetKey);
    setError(undefined);
    try {
      const result = existing
        ? await onDeactivate(existing.id)
        : await onActivate(presetKey);
      if (!result.ok) setError(bookingFormErrorText(result.code));
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <Card
      tone="lime"
      radius="tile"
      padding="lg"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-14 font-bold text-ink">
            {formulario.sugerencias.titulo({
              bransch: industryLabel(industry),
            })}
          </p>
          <p className="text-13 text-on-lime-soft">
            {formulario.sugerencias.cuerpo({ n: presets.length })}
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setOpen((v) => !v)}>
          {open
            ? formulario.sugerencias.ctaOcultar
            : formulario.sugerencias.ctaVer}
        </Button>
      </div>

      {open ? (
        <div className="flex flex-col gap-2 rounded-tile bg-surface p-3 fields-on-surface">
          {presets.map((preset) => {
            const existing = questions.find((q) => q.presetKey === preset.key);
            const active = existing?.active ?? false;
            return (
              <div
                key={preset.key}
                className="flex items-center gap-3 border-b border-line-strong py-2 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-14 font-semibold text-ink">
                    {preset.label}
                  </p>
                  <p className="truncate text-12 text-muted">
                    {formulario.tipos[preset.type]}
                  </p>
                </div>
                <Switch
                  checked={active}
                  disabled={pendingKey === preset.key}
                  onChange={() => void toggle(preset.key, existing)}
                  label={preset.label}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-13 font-semibold text-ink">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
