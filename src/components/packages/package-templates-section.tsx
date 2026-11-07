"use client";

// WP-86 (D-072): Ajustes → Paquetes. Samma master–detail-mönster som
// `settings/services-section.tsx` (D-042): listan till vänster, formuläret i
// en `lg:sticky`-kolumn till höger. Ingen radering: en mall avaktiveras
// (sålda paket pekar på den). Priset skrivs och visas via
// `src/lib/format/money.ts`; servern validerar allt igen.
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { TextField } from "@/components/ui/text-field";
import { comun, paquetes } from "@/i18n";
import { formatMoney, moneyInputValue, parseMoney } from "@/lib/format/money";

import {
  packageErrorText,
  type PackageActionResult,
  type PackageServiceOption,
  type PackageTemplate,
  type SaveTemplateInput,
} from "./types";

type Form = {
  name: string;
  serviceIds: string[];
  sessions: string;
  price: string;
  validityDays: string;
  showPublic: boolean;
};

type FormErrors = Partial<Record<keyof Form | "form", string>>;

const EMPTY: Form = {
  name: "",
  serviceIds: [],
  sessions: "",
  price: "",
  validityDays: "",
  showPublic: true,
};

function toForm(t: PackageTemplate): Form {
  return {
    name: t.name,
    serviceIds: t.serviceIds,
    sessions: String(t.sessions),
    price: moneyInputValue(t.priceClp),
    validityDays: t.validityDays === null ? "" : String(t.validityDays),
    showPublic: t.showPublic,
  };
}

function intIn(v: string, min: number, max: number): number | null {
  const t = v.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= min && n <= max ? n : null;
}

function validate(f: Form): {
  errors: FormErrors;
  payload: Omit<SaveTemplateInput, "active"> | null;
} {
  const errors: FormErrors = {};
  const name = f.name.trim();
  if (name.length < 1 || name.length > 80)
    errors.name = paquetes.errores.invalid;
  if (f.serviceIds.length === 0)
    errors.serviceIds = paquetes.errores.sin_servicios;
  const sessions = intIn(f.sessions, 1, 100);
  if (sessions === null) errors.sessions = paquetes.errores.invalid;
  const price = parseMoney(f.price);
  const priceOk = price.ok && price.value >= 1 && price.value <= 100_000_000;
  if (!priceOk) errors.price = paquetes.errores.invalid;
  const validity =
    f.validityDays.trim() === "" ? null : intIn(f.validityDays, 1, 1095);
  if (f.validityDays.trim() !== "" && validity === null) {
    errors.validityDays = paquetes.errores.invalid;
  }
  if (Object.keys(errors).length > 0 || sessions === null || !price.ok) {
    return { errors, payload: null };
  }
  return {
    errors,
    payload: {
      name,
      serviceIds: f.serviceIds,
      sessions,
      priceClp: price.value,
      validityDays: validity,
      showPublic: f.showPublic,
    },
  };
}

export type PackageTemplatesSectionProps = {
  templates: PackageTemplate[];
  services: PackageServiceOption[];
  /** `false` = planen saknar paket: listan visas, men inget kan skapas. */
  editable: boolean;
  onSave: (
    input: SaveTemplateInput,
  ) => Promise<PackageActionResult<{ id: string }>>;
};

export function PackageTemplatesSection({
  templates,
  services,
  editable,
  onSave,
}: PackageTemplatesSectionProps) {
  const [list, setList] = useState(templates);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const serviceName = new Map(services.map((s) => [s.id, s.name]));
  const editing =
    editingId && editingId !== "new"
      ? (list.find((t) => t.id === editingId) ?? null)
      : null;
  // Inaktiva tjänster visas bara om mallen redan har dem.
  const pickable = services.filter(
    (s) => s.active || form.serviceIds.includes(s.id),
  );

  function startNew() {
    setEditingId("new");
    setForm(EMPTY);
    setErrors({});
    setSaved(false);
  }

  function startEdit(t: PackageTemplate) {
    setEditingId(t.id);
    setForm(toForm(t));
    setErrors({});
    setSaved(false);
  }

  function toggleService(id: string) {
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id)
        ? f.serviceIds.filter((x) => x !== id)
        : [...f.serviceIds, id],
    }));
  }

  async function submit() {
    const { errors: next, payload } = validate(form);
    setErrors(next);
    if (!payload || saving) return;
    setSaving(true);
    const active = editing ? editing.active : true;
    const result = await onSave({
      ...payload,
      active,
      ...(editing ? { id: editing.id } : {}),
    });
    setSaving(false);
    if (!result.ok) {
      setErrors({ form: packageErrorText(result.code) });
      return;
    }
    const row: PackageTemplate = { ...payload, active, id: result.id };
    setList((prev) =>
      editing
        ? prev.map((t) => (t.id === editing.id ? row : t))
        : [...prev, row],
    );
    setEditingId(null);
    setSaved(true);
  }

  async function toggleActive(t: PackageTemplate) {
    if (pendingId) return;
    setPendingId(t.id);
    const { id, ...rest } = t;
    const result = await onSave({ ...rest, id, active: !t.active });
    setPendingId(null);
    if (result.ok) {
      setList((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, active: !x.active } : x)),
      );
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-list-editor lg:items-start">
      <Card radius="tile" padding="lg" className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-18 font-bold text-ink">
            {paquetes.ajustes.titulo}
          </h2>
          <p className="text-13 leading-body text-muted">
            {paquetes.ajustes.intro}
          </p>
        </div>

        {list.length === 0 ? (
          <p className="text-13 text-muted">{paquetes.ajustes.vacio}</p>
        ) : null}

        <div className="flex flex-col gap-3">
          {list.map((t) => (
            <div
              key={t.id}
              className={cn(
                "flex flex-col items-start gap-3 rounded-tile border-2 bg-canvas p-4 sm:flex-row sm:items-center sm:justify-between",
                editingId === t.id ? "border-ink" : "border-transparent",
                !t.active && "opacity-50",
              )}
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-15 font-bold text-ink">{t.name}</span>
                  {!t.active ? (
                    <Chip tone="neutral" size="sm">
                      {paquetes.ajustes.inactivo}
                    </Chip>
                  ) : null}
                  {t.active && t.showPublic ? (
                    <Chip tone="success" size="sm">
                      {paquetes.ajustes.publico}
                    </Chip>
                  ) : null}
                </div>
                <span className="text-13 text-muted">
                  {paquetes.ajustes.resumen({
                    sesiones: t.sessions,
                    precio: formatMoney(t.priceClp),
                  })}{" "}
                  ·{" "}
                  {t.validityDays === null
                    ? paquetes.ajustes.sinVencimiento
                    : paquetes.ajustes.venceEnDias({ dias: t.validityDays })}
                </span>
                <span className="text-13 text-muted">
                  {t.serviceIds
                    .map((id) => serviceName.get(id))
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
              {editable ? (
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => startEdit(t)}
                  >
                    {comun.editar}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={pendingId === t.id}
                    onClick={() => void toggleActive(t)}
                  >
                    {t.active
                      ? paquetes.ajustes.desactivar
                      : paquetes.ajustes.activar}
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {editable && editingId === null ? (
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="self-start"
            onClick={startNew}
          >
            {paquetes.ajustes.nuevo}
          </Button>
        ) : null}
        {saved ? (
          <p role="status" className="text-13 text-muted">
            {paquetes.ajustes.guardado}
          </p>
        ) : null}
      </Card>

      {editable && editingId !== null ? (
        <div className="flex flex-col gap-3 lg:sticky lg:top-0">
          <Card radius="tile" padding="lg" className="flex flex-col gap-4">
            <h3 className="text-16 font-bold text-ink">
              {editing ? paquetes.ajustes.editar : paquetes.ajustes.nuevo}
            </h3>
            <TextField
              label={paquetes.ajustes.nombreLabel}
              hint={errors.name ? undefined : paquetes.ajustes.nombreAyuda}
              value={form.name}
              maxLength={80}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
            />
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-13 font-semibold text-ink">
                {paquetes.ajustes.serviciosLabel}
              </legend>
              <p className="text-13 text-muted">
                {paquetes.ajustes.serviciosAyuda}
              </p>
              {pickable.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-3 text-14 text-ink"
                >
                  <input
                    type="checkbox"
                    checked={form.serviceIds.includes(s.id)}
                    onChange={() => toggleService(s.id)}
                    className="size-5 shrink-0 accent-ink"
                  />
                  {s.name}
                </label>
              ))}
              {errors.serviceIds ? (
                <p role="alert" className="text-13 text-ink">
                  {errors.serviceIds}
                </p>
              ) : null}
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label={paquetes.ajustes.sesionesLabel}
                inputMode="numeric"
                value={form.sessions}
                onChange={(e) => setForm({ ...form, sessions: e.target.value })}
                error={errors.sessions}
              />
              <TextField
                label={paquetes.ajustes.precioLabel}
                inputMode="numeric"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                error={errors.price}
              />
            </div>
            <TextField
              label={paquetes.ajustes.vigenciaLabel}
              hint={
                errors.validityDays ? undefined : paquetes.ajustes.vigenciaAyuda
              }
              inputMode="numeric"
              value={form.validityDays}
              onChange={(e) =>
                setForm({ ...form, validityDays: e.target.value })
              }
              error={errors.validityDays}
            />
            <label className="flex cursor-pointer items-start gap-3 text-14 text-ink">
              <input
                type="checkbox"
                checked={form.showPublic}
                onChange={(e) =>
                  setForm({ ...form, showPublic: e.target.checked })
                }
                className="mt-0.5 size-5 shrink-0 accent-ink"
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">
                  {paquetes.ajustes.mostrarPublico}
                </span>
                <span className="text-13 text-muted">
                  {paquetes.ajustes.mostrarPublicoAyuda}
                </span>
              </span>
            </label>
            {errors.form ? (
              <p role="alert" className="text-13 text-ink">
                {errors.form}
              </p>
            ) : null}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => {
                  setEditingId(null);
                  setErrors({});
                }}
              >
                {comun.cerrar}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={saving}
                onClick={() => void submit()}
              >
                {comun.guardar}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
