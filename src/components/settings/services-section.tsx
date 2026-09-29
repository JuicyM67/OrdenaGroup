"use client";

// Sección "Servicios" (WP-15b slim, ver plan): lista, agregar, editar (nombre, minutos,
// precio, buffer) y activar/desactivar. Sin eliminar (la base de datos bloquea borrar un
// servicio con reservas; en vez de manejar ese error, esta pantalla no ofrece borrar —
// ver `docs/tasks/plans/WP-15b.md`). Un solo formulario abierto a la vez (nuevo o editar).
import { useState } from "react";
import { comun } from "@/i18n/es-CL";

import {
  validateDurationMin,
  validatePriceClp,
  validateRequired,
} from "@/components/onboarding/client-validation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { TextField } from "@/components/ui/text-field";
import { ajustes, servicios } from "@/i18n";
import { formatDuration } from "@/lib/format/dates";
import { formatMoney, moneyInputValue, parseMoney } from "@/lib/format/money";

import { ajustesErrorText } from "./error-text";
import type { AjustesActions, AjustesService } from "./types";

type RowForm = {
  name: string;
  durationMin: string;
  priceClp: string;
  bufferAfterMin: string;
};
type RowErrors = Partial<Record<keyof RowForm, string>>;

const EMPTY_FORM: RowForm = {
  name: "",
  durationMin: "",
  priceClp: "",
  bufferAfterMin: "0",
};

function toRowForm(s: AjustesService): RowForm {
  return {
    name: s.name,
    durationMin: String(s.durationMin),
    priceClp: moneyInputValue(s.priceClp),
    bufferAfterMin: String(s.bufferAfterMin),
  };
}

/** Redan validerat i `validateRow`; minsta enheten (CLP: pesos, SEK: öre). */
function priceFromForm(raw: string): number {
  const r = parseMoney(raw);
  return r.ok ? r.value : 0;
}

function validateRow(form: RowForm): { errors: RowErrors; payload?: unknown } {
  const name = validateRequired(form.name, "services.name_empty");
  const durationMin = validateDurationMin(form.durationMin);
  const priceClp = validatePriceClp(form.priceClp);
  const bufferRaw = form.bufferAfterMin.trim();
  const bufferN = Number(bufferRaw);
  const bufferOk =
    bufferRaw !== "" &&
    Number.isInteger(bufferN) &&
    bufferN >= 0 &&
    bufferN <= 600;

  const errors: RowErrors = {};
  if (!name.ok) errors.name = ajustesErrorText(name.code);
  if (!durationMin.ok) errors.durationMin = ajustesErrorText(durationMin.code);
  if (!priceClp.ok) errors.priceClp = ajustesErrorText(priceClp.code);
  if (!bufferOk)
    errors.bufferAfterMin = ajustesErrorText("services.buffer_invalid");
  if (Object.keys(errors).length > 0) return { errors };

  return {
    errors: {},
    payload: {
      name: form.name.trim(),
      durationMin: form.durationMin,
      priceClp: form.priceClp,
      bufferAfterMin: bufferN,
    },
  };
}

function ServiceForm({
  form,
  errors,
  saving,
  onChange,
  onCancel,
  onSubmit,
}: {
  form: RowForm;
  errors: RowErrors;
  saving: boolean;
  onChange: (form: RowForm) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      data-testid="service-editor"
      className="flex flex-col gap-3 rounded-tile bg-canvas p-4"
    >
      <TextField
        label={servicios.campos.nameLabel}
        placeholder={servicios.campos.namePlaceholder}
        hint={servicios.campos.nombreAyuda}
        value={form.name}
        onChange={(e) => onChange({ ...form, name: e.target.value })}
        error={errors.name}
        maxLength={120}
      />
      <div className="flex gap-3">
        <TextField
          label={servicios.campos.durationLabel}
          inputMode="numeric"
          value={form.durationMin}
          onChange={(e) => onChange({ ...form, durationMin: e.target.value })}
          error={errors.durationMin}
        />
        <TextField
          label={servicios.campos.priceLabel}
          inputMode="numeric"
          placeholder="$10.000"
          value={form.priceClp}
          onChange={(e) => onChange({ ...form, priceClp: e.target.value })}
          error={errors.priceClp}
        />
      </div>
      <TextField
        label={servicios.campos.bufferLabel}
        hint={errors.bufferAfterMin ? undefined : servicios.campos.bufferAyuda}
        inputMode="numeric"
        value={form.bufferAfterMin}
        onChange={(e) => onChange({ ...form, bufferAfterMin: e.target.value })}
        error={errors.bufferAfterMin}
      />
      <div className="flex gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          {ajustes.seguirEditando}
        </Button>
        <Button type="button" size="sm" disabled={saving} onClick={onSubmit}>
          {saving ? ajustes.guardando : ajustes.guardarCambios}
        </Button>
      </div>
    </div>
  );
}

export function ServicesSection({
  services,
  actions,
}: {
  services: AjustesService[];
  actions: {
    create: AjustesActions["createService"];
    update: AjustesActions["updateService"];
    setActive: AjustesActions["setServiceActive"];
  };
}) {
  const [list, setList] = useState(services);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<RowForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<RowErrors>({});
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function startNew() {
    setEditingId("new");
    setForm(EMPTY_FORM);
    setErrors({});
  }

  function startEdit(s: AjustesService) {
    setEditingId(s.id);
    setForm(toRowForm(s));
    setErrors({});
  }

  function cancel() {
    setEditingId(null);
    setErrors({});
  }

  async function submit() {
    const { errors: nextErrors, payload } = validateRow(form);
    setErrors(nextErrors);
    if (!payload) return;

    setSaving(true);
    try {
      if (editingId === "new") {
        const result = await actions.create(payload);
        if (result.ok) {
          setList((prev) => [
            ...prev,
            {
              id: result.id,
              name: form.name.trim(),
              durationMin: Number(form.durationMin),
              priceClp: priceFromForm(form.priceClp),
              bufferAfterMin: Number(form.bufferAfterMin),
              active: true,
            },
          ]);
          setEditingId(null);
        } else {
          setErrors({ name: ajustesErrorText(result.code) });
        }
      } else if (editingId) {
        const result = await actions.update(editingId, payload);
        if (result.ok) {
          setList((prev) =>
            prev.map((s) =>
              s.id === editingId
                ? {
                    ...s,
                    name: form.name.trim(),
                    durationMin: Number(form.durationMin),
                    priceClp: priceFromForm(form.priceClp),
                    bufferAfterMin: Number(form.bufferAfterMin),
                  }
                : s,
            ),
          );
          setEditingId(null);
        } else {
          setErrors({ name: ajustesErrorText(result.code) });
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: AjustesService) {
    setPendingId(s.id);
    try {
      const result = await actions.setActive(s.id, !s.active);
      if (result.ok) {
        setList((prev) =>
          prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)),
        );
      }
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-4">
      <h2 className="text-18 font-bold text-ink">
        {ajustes.secciones.servicios}
      </h2>

      {list.length === 0 && editingId !== "new" ? (
        <p className="text-13 text-muted">{servicios.vacio}</p>
      ) : null}

      <div className="flex flex-col gap-3">
        {list.map((s) =>
          editingId === s.id ? (
            <ServiceForm
              key={s.id}
              form={form}
              errors={errors}
              saving={saving}
              onChange={setForm}
              onCancel={cancel}
              onSubmit={() => void submit()}
            />
          ) : (
            <div
              key={s.id}
              data-testid="service-row"
              className={cn(
                "flex items-center justify-between gap-3 rounded-tile bg-canvas p-4",
                !s.active && "opacity-50",
              )}
            >
              <div className="min-w-0">
                <p className="text-15 font-bold text-ink">{s.name}</p>
                <p className="text-13 text-muted">
                  {formatDuration(s.durationMin)} · {formatMoney(s.priceClp)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => startEdit(s)}
                >
                  {comun.editar}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pendingId === s.id}
                  onClick={() => void toggleActive(s)}
                >
                  {s.active ? servicios.ctaDesactivar : servicios.ctaActivar}
                </Button>
              </div>
            </div>
          ),
        )}

        {editingId === "new" ? (
          <ServiceForm
            form={form}
            errors={errors}
            saving={saving}
            onChange={setForm}
            onCancel={cancel}
            onSubmit={() => void submit()}
          />
        ) : null}
      </div>

      {editingId === null ? (
        <Button type="button" variant="secondary" size="lg" onClick={startNew}>
          {servicios.ctaAgregar}
        </Button>
      ) : null}
    </Card>
  );
}
