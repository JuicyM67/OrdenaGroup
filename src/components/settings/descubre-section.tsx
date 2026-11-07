"use client";

// Ajustes → Tu negocio → "Descubre" (WP-85, D-070, port av SE:s D-073): "Mostrar
// mi negocio en Descubre", rubro (= huvudkategori) och "También ofrecemos". Förslagen
// ur tjänsterna är förbockade tills ägaren sparat första gången (`reviewed`) och märks
// "Sugerida". Ingen referens i *.dc.html — byggd av befintliga delar (Card, Switch,
// Select).
import { AlertCircle, Check, CheckCircle2, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CATEGORY_UI } from "@/components/marketplace/categories";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  categoryForRubro,
  MARKETPLACE_CATEGORY_IDS,
  MARKETPLACE_EXTRA_CATEGORIES_MAX,
  type MarketplaceCategoryId,
} from "@/config/marketplace";
import { RUBRO_KEYS, type RubroKey } from "@/config/rubros";
import { ajustes, descubre, negocio, descubreAjustes as t } from "@/i18n";

import { ajustesErrorText } from "./error-text";
import type { MutationResult, DescubreSettings } from "./types";

export type DescubreSettingsInput = {
  listed: boolean;
  rubro: RubroKey;
  extraCategories: MarketplaceCategoryId[];
};

export function DescubreSection({
  settings,
  action,
}: {
  settings: DescubreSettings;
  action: (input: DescubreSettingsInput) => Promise<MutationResult>;
}) {
  const router = useRouter();
  const [listed, setListed] = useState(settings.listed);
  const [rubro, setRubro] = useState<RubroKey>(settings.rubro);
  const [extras, setExtras] = useState<MarketplaceCategoryId[]>(
    settings.extraCategories,
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [submitError, setSubmitError] = useState<string | undefined>();

  const main = categoryForRubro(rubro);
  const options = MARKETPLACE_CATEGORY_IDS.filter((id) => id !== main);
  const chosen = extras.filter((id) => id !== main);
  const full = chosen.length >= MARKETPLACE_EXTRA_CATEGORIES_MAX;

  function toggle(id: MarketplaceCategoryId) {
    setStatus("idle");
    setExtras((xs) =>
      xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id],
    );
  }

  async function save() {
    setStatus("saving");
    setSubmitError(undefined);
    try {
      const result = await action({ listed, rubro, extraCategories: chosen });
      if (result.ok) {
        setStatus("saved");
        router.refresh();
      } else {
        setStatus("error");
        setSubmitError(ajustesErrorText(result.code));
      }
    } catch {
      setStatus("error");
      setSubmitError(ajustesErrorText("unknown"));
    }
  }

  const complete = settings.missing.length === 0;

  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-18 font-bold text-ink">{t.titulo}</h2>
        <p className="text-14 text-muted">{t.intro}</p>
      </div>

      {settings.hidden ? (
        <p className="flex items-start gap-2 rounded-control bg-canvas p-3 text-14 text-ink">
          <EyeOff
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
            strokeWidth={2}
          />
          {t.estado.ocultoPlataforma}
        </p>
      ) : listed && complete ? (
        <p className="flex items-center gap-2 rounded-control bg-success-bg p-3 text-14 font-semibold text-success-fg">
          <CheckCircle2
            aria-hidden="true"
            className="size-4 shrink-0"
            strokeWidth={2}
          />
          {t.estado.visible}
        </p>
      ) : listed ? (
        <div className="flex flex-col gap-2 rounded-control bg-pending-bg p-3 text-14 text-ink">
          <p className="flex items-center gap-2 font-semibold">
            <AlertCircle
              aria-hidden="true"
              className="size-4 shrink-0"
              strokeWidth={2}
            />
            {t.estado.falta}
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-10">
            {settings.missing.map((m) => (
              <li key={m}>{t.faltan[m]}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-14 font-semibold text-ink">{t.visibleLabel}</p>
          <p className="mt-0.5 text-12 text-muted">{t.visibleAyuda}</p>
        </div>
        <Switch
          checked={listed}
          onChange={(v) => {
            setListed(v);
            setStatus("idle");
          }}
          label={t.visibleLabel}
          disabled={settings.hidden}
        />
      </div>

      <div className="border-t border-line-strong pt-5">
        <Select
          label={t.rubroLabel}
          hint={t.rubroAyuda}
          value={rubro}
          onChange={(e) => {
            setRubro(e.target.value as RubroKey);
            setStatus("idle");
          }}
          className="lg:max-w-80"
        >
          {RUBRO_KEYS.map((id) => (
            <option key={id} value={id}>
              {negocio.rubros[id]}
            </option>
          ))}
        </Select>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-14 font-semibold text-ink">
          {t.extrasTitulo}
        </legend>
        <p className="mt-1 text-12 text-muted">
          {!settings.reviewed && settings.suggested.length > 0
            ? t.extrasSugerencia
            : t.extrasAyuda({ max: MARKETPLACE_EXTRA_CATEGORIES_MAX })}
        </p>
        <ul className="flex flex-wrap gap-2">
          {options.map((id) => {
            const on = chosen.includes(id);
            const Icon = CATEGORY_UI[id].icon;
            const suggested = settings.suggested.includes(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  disabled={!on && full}
                  onClick={() => toggle(id)}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-full border pr-3.5 pl-2 text-14 font-semibold transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40",
                    on
                      ? "border-ink bg-ink text-on-dark"
                      : "border-border bg-surface text-ink hover:bg-field",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-6.5 items-center justify-center rounded-full",
                      on ? "bg-lime text-ink" : CATEGORY_UI[id].tone,
                    )}
                  >
                    {on ? (
                      <Check className="size-3.5" strokeWidth={3} />
                    ) : (
                      <Icon className="size-3.5" strokeWidth={2} />
                    )}
                  </span>
                  {descubre.categorias.nombres[id]}
                  {suggested ? (
                    <span
                      className={cn(
                        "rounded-badge px-1.5 py-0.5 text-11 font-bold",
                        on ? "bg-dark-2 text-lime" : "bg-lime text-ink",
                      )}
                    >
                      {t.sugerida}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {submitError ? (
        <p role="alert" className="text-13 font-semibold text-ink">
          {submitError}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="xl"
          disabled={status === "saving"}
          onClick={() => void save()}
        >
          {status === "saving" ? ajustes.guardando : t.guardar}
        </Button>
        {status === "saved" ? (
          <span role="status" className="text-13 text-muted">
            {ajustes.cambiosGuardados}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
