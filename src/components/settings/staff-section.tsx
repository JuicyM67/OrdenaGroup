"use client";

// Sección "Equipo" (WP-15b slim, ver plan): lista, agregar, editar (nombre y qué servicios
// hace) y activar/desactivar. Sin eliminar ni color (fuera del alcance, ver la plan). Un
// solo formulario abierto a la vez.
import { useState } from "react";
import { comun } from "@/i18n";

import { validateRequired } from "@/components/onboarding/client-validation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Pill } from "@/components/ui/pill";
import { TextField } from "@/components/ui/text-field";
import { ajustes, profesionales } from "@/i18n";

import { ajustesErrorText } from "./error-text";
import type {
  AjustesActions,
  AjustesService,
  AjustesStaffMember,
} from "./types";

type RowForm = { name: string; serviceIds: string[] };
type RowErrors = { name?: string };

function toRowForm(s: AjustesStaffMember): RowForm {
  return { name: s.name, serviceIds: s.serviceIds };
}

function StaffForm({
  form,
  errors,
  services,
  saving,
  onChange,
  onCancel,
  onSubmit,
}: {
  form: RowForm;
  errors: RowErrors;
  services: AjustesService[];
  saving: boolean;
  onChange: (form: RowForm) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  function toggleService(serviceId: string) {
    const has = form.serviceIds.includes(serviceId);
    onChange({
      ...form,
      serviceIds: has
        ? form.serviceIds.filter((id) => id !== serviceId)
        : [...form.serviceIds, serviceId],
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-tile bg-canvas p-4">
      <TextField
        label={profesionales.campos.nameLabel}
        value={form.name}
        onChange={(e) => onChange({ ...form, name: e.target.value })}
        error={errors.name}
        maxLength={120}
      />
      {services.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-13 font-semibold text-ink">
            {profesionales.campos.serviciosLabel}
          </span>
          <div className="flex flex-wrap gap-2">
            {services.map((svc) => (
              <Pill
                key={svc.id}
                selected={form.serviceIds.includes(svc.id)}
                onClick={() => toggleService(svc.id)}
              >
                {svc.name}
              </Pill>
            ))}
          </div>
        </div>
      ) : null}
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

export function StaffSection({
  staff,
  services,
  actions,
}: {
  staff: AjustesStaffMember[];
  services: AjustesService[];
  actions: {
    create: AjustesActions["createStaff"];
    update: AjustesActions["updateStaff"];
    setActive: AjustesActions["setStaffActive"];
  };
}) {
  const [list, setList] = useState(staff);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<RowForm>({ name: "", serviceIds: [] });
  const [errors, setErrors] = useState<RowErrors>({});
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function startNew() {
    setEditingId("new");
    setForm({ name: "", serviceIds: [] });
    setErrors({});
  }

  function startEdit(s: AjustesStaffMember) {
    setEditingId(s.id);
    setForm(toRowForm(s));
    setErrors({});
  }

  function cancel() {
    setEditingId(null);
    setErrors({});
  }

  async function submit() {
    const name = validateRequired(form.name, "staff.name_empty");
    if (!name.ok) {
      setErrors({ name: ajustesErrorText(name.code) });
      return;
    }
    setErrors({});
    const payload = { name: form.name.trim(), serviceIds: form.serviceIds };

    setSaving(true);
    try {
      if (editingId === "new") {
        const result = await actions.create(payload);
        if (result.ok) {
          setList((prev) => [
            ...prev,
            {
              id: result.id,
              name: payload.name,
              active: true,
              serviceIds: payload.serviceIds,
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
                ? { ...s, name: payload.name, serviceIds: payload.serviceIds }
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

  async function toggleActive(s: AjustesStaffMember) {
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
      <h2 className="text-18 font-bold text-ink">{ajustes.secciones.equipo}</h2>

      {list.length === 0 && editingId !== "new" ? (
        <p className="text-13 text-muted">{profesionales.vacio}</p>
      ) : null}

      <div className="flex flex-col gap-3">
        {list.map((s) =>
          editingId === s.id ? (
            <StaffForm
              key={s.id}
              form={form}
              errors={errors}
              services={services}
              saving={saving}
              onChange={setForm}
              onCancel={cancel}
              onSubmit={() => void submit()}
            />
          ) : (
            <div
              key={s.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-tile bg-canvas p-4",
                !s.active && "opacity-50",
              )}
            >
              <div className="min-w-0">
                <p className="text-15 font-bold text-ink">{s.name}</p>
                {s.serviceIds.length > 0 ? (
                  <p className="text-13 text-muted">
                    {services
                      .filter((svc) => s.serviceIds.includes(svc.id))
                      .map((svc) => svc.name)
                      .join(", ")}
                  </p>
                ) : null}
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
                  {s.active
                    ? profesionales.ctaDesactivar
                    : profesionales.ctaActivar}
                </Button>
              </div>
            </div>
          ),
        )}

        {editingId === "new" ? (
          <StaffForm
            form={form}
            errors={errors}
            services={services}
            saving={saving}
            onChange={setForm}
            onCancel={cancel}
            onSubmit={() => void submit()}
          />
        ) : null}
      </div>

      {editingId === null ? (
        <Button type="button" variant="secondary" size="lg" onClick={startNew}>
          {profesionales.ctaAgregar}
        </Button>
      ) : null}
    </Card>
  );
}
