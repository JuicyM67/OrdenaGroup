"use client";

// Sección "Servicios" (WP-15b slim, ver plan): lista, agregar, editar (nombre, minutos,
// precio, buffer) y activar/desactivar. Sin eliminar (la base de datos bloquea borrar un
// servicio con reservas; en vez de manejar ese error, esta pantalla no ofrece borrar —
// ver `docs/tasks/plans/WP-15b.md`). Un solo formulario abierto a la vez (nuevo o editar).
import { useState } from "react";
import { comun } from "@/i18n";

import {
  validateDurationMin,
  validatePriceClp,
  validateRequired,
} from "@/components/onboarding/client-validation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Textarea } from "@/components/ui/textarea";
import { TextField } from "@/components/ui/text-field";
import { ajustes, formulario, servicios } from "@/i18n";
import { formatDuration } from "@/lib/format/dates";
import { formatMoney, moneyInputValue, parseMoney } from "@/lib/format/money";
import { SERVICE_DESCRIPTION_MAX } from "@/lib/validation/profile";

import { ajustesErrorText } from "./error-text";
import type {
  BookingFormActions,
  BookingFormSettings,
} from "./booking-form-types";
import { ServiceQuestionsTab } from "./service-questions-tab";
import type { AjustesActions, AjustesService } from "./types";

/** Delas ner till `ServiceForm` bara när tjänsten redan finns (vy B, WP-40
 * steg 7, D-031): en ny, oskapad tjänst har inget `serviceId` att koppla
 * frågor mot än. */
export type ServiceQuestionsBundle = {
  settings: BookingFormSettings;
  businessCategory: string | null;
  actions: BookingFormActions;
  onReload: () => Promise<void>;
};

type RowForm = {
  name: string;
  durationMin: string;
  priceClp: string;
  bufferAfterMin: string;
  description: string;
};
type RowErrors = Partial<Record<keyof RowForm, string>>;

const EMPTY_FORM: RowForm = {
  name: "",
  durationMin: "",
  priceClp: "",
  bufferAfterMin: "0",
  description: "",
};

function toRowForm(s: AjustesService): RowForm {
  return {
    name: s.name,
    durationMin: String(s.durationMin),
    priceClp: moneyInputValue(s.priceClp),
    bufferAfterMin: String(s.bufferAfterMin),
    description: s.description,
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

  const description = form.description.trim();
  const descriptionOk = description.length <= SERVICE_DESCRIPTION_MAX;

  const errors: RowErrors = {};
  if (!name.ok) errors.name = ajustesErrorText(name.code);
  if (!durationMin.ok) errors.durationMin = ajustesErrorText(durationMin.code);
  if (!priceClp.ok) errors.priceClp = ajustesErrorText(priceClp.code);
  if (!bufferOk)
    errors.bufferAfterMin = ajustesErrorText("services.buffer_invalid");
  if (!descriptionOk)
    errors.description = ajustesErrorText("services.description_too_long");
  if (Object.keys(errors).length > 0) return { errors };

  return {
    errors: {},
    payload: {
      name: form.name.trim(),
      durationMin: form.durationMin,
      priceClp: form.priceClp,
      bufferAfterMin: bufferN,
      description,
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
  serviceId,
  bookingForm,
}: {
  form: RowForm;
  errors: RowErrors;
  saving: boolean;
  onChange: (form: RowForm) => void;
  onCancel: () => void;
  onSubmit: () => void;
  /** `undefined` = tjänsten skapas nu (vy B kräver ett sparat id). */
  serviceId?: string;
  bookingForm?: ServiceQuestionsBundle;
}) {
  const [tab, setTab] = useState<"detalles" | "preguntas">("detalles");

  return (
    <div
      data-testid="service-editor"
      className="flex flex-col gap-3 rounded-tile bg-canvas p-4"
    >
      {serviceId && bookingForm ? (
        <div
          role="tablist"
          aria-label={ajustes.secciones.servicios}
          className="flex gap-1.5"
        >
          <Button
            type="button"
            role="tab"
            aria-selected={tab === "detalles"}
            variant={tab === "detalles" ? "primary" : "secondary"}
            size="xs"
            onClick={() => setTab("detalles")}
          >
            {formulario.servicioPregunta.pestanaDetalles}
          </Button>
          <Button
            type="button"
            role="tab"
            aria-selected={tab === "preguntas"}
            variant={tab === "preguntas" ? "primary" : "secondary"}
            size="xs"
            onClick={() => setTab("preguntas")}
          >
            {formulario.servicioPregunta.pestana}
          </Button>
        </div>
      ) : null}

      {tab === "preguntas" && serviceId && bookingForm ? (
        <ServiceQuestionsTab
          serviceId={serviceId}
          settings={bookingForm.settings}
          businessCategory={bookingForm.businessCategory}
          actions={bookingForm.actions}
          onReload={bookingForm.onReload}
        />
      ) : (
        <>
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
              onChange={(e) =>
                onChange({ ...form, durationMin: e.target.value })
              }
              error={errors.durationMin}
            />
            <TextField
              label={servicios.campos.priceLabel}
              inputMode="numeric"
              placeholder={servicios.campos.pricePlaceholder}
              value={form.priceClp}
              onChange={(e) => onChange({ ...form, priceClp: e.target.value })}
              error={errors.priceClp}
            />
          </div>
          <TextField
            label={servicios.campos.bufferLabel}
            hint={
              errors.bufferAfterMin ? undefined : servicios.campos.bufferAyuda
            }
            inputMode="numeric"
            value={form.bufferAfterMin}
            onChange={(e) =>
              onChange({ ...form, bufferAfterMin: e.target.value })
            }
            error={errors.bufferAfterMin}
          />
          <Textarea
            label={servicios.campos.descripcionLabel}
            placeholder={servicios.campos.descripcionPlaceholder}
            hint={
              errors.description ? undefined : servicios.campos.descripcionAyuda
            }
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
            error={errors.description}
            maxLength={SERVICE_DESCRIPTION_MAX}
          />
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onCancel}
            >
              {ajustes.seguirEditando}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={onSubmit}
            >
              {saving ? ajustes.guardando : ajustes.guardarCambios}
            </Button>
          </div>
        </>
      )}

      {tab === "preguntas" && serviceId && bookingForm ? (
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          {comun.cerrar}
        </Button>
      ) : null}
    </div>
  );
}

export function ServicesSection({
  services,
  actions,
  bookingForm,
}: {
  services: AjustesService[];
  actions: {
    create: AjustesActions["createService"];
    update: AjustesActions["updateService"];
    setActive: AjustesActions["setServiceActive"];
  };
  /** Vy B (WP-40 steg 7): saknas den, visas ingen flik "Frågor vid bokning". */
  bookingForm?: ServiceQuestionsBundle;
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
              description: form.description.trim(),
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
                    description: form.description.trim(),
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
              serviceId={s.id}
              bookingForm={bookingForm}
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
