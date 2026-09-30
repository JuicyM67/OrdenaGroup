"use client";

// Sección "Equipo" (WP-15b slim, ver plan): lista, agregar, editar (nombre y qué servicios
// hace) y activar/desactivar. Sin eliminar ni color (fuera del alcance, ver la plan). Un
// solo formulario abierto a la vez.
import { useId, useRef, useState } from "react";
import { comun } from "@/i18n";

import { validateRequired } from "@/components/onboarding/client-validation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Pill } from "@/components/ui/pill";
import { TextField } from "@/components/ui/text-field";
import { ajustes, perfil, profesionales } from "@/i18n";
import { initialsOf } from "@/lib/format/initials";
import { IMAGE_CONTENT_TYPES, STAFF_TITLE_MAX } from "@/lib/validation/profile";

import { ajustesErrorText } from "./error-text";
import type { ProfileActions } from "./profile-types";
import { uploadImage } from "./upload-image";
import type {
  AjustesActions,
  AjustesService,
  AjustesStaffMember,
} from "./types";

/** WP-44: foto, gratis i alla planer. Samma uppladdningsflöde som
 * omslag/logo (profile-section.tsx → ./upload-image.ts), bara `kind: "staff"`
 * och `staffId` i stället för `kind: "cover" | "logo"`. */
type StaffPhotoActions = Pick<
  ProfileActions,
  "createImageUpload" | "confirmImageUpload" | "deleteImage"
>;

/** Bara knapparna (WP-44 mobillayout, granskningsfynd): avataren renderas
 * separat bredvid namnet (rad 1 på 390 px), knapparna får en egen rad (rad
 * 2) — annars trycks namnet/tjänsterna in i en smal kolumn bredvid knapparna
 * på 390 px. */
function StaffPhotoButtons({
  staffId,
  url,
  actions,
  onChange,
}: {
  staffId: string;
  url: string | null;
  actions: StaffPhotoActions;
  onChange: (url: string | null) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleFile(file: File) {
    setBusy(true);
    setError(undefined);
    try {
      const result = await uploadImage(
        file,
        { kind: "staff", staffId },
        actions,
      );
      if ("code" in result) {
        setError(ajustesErrorText(result.code));
      } else {
        onChange(result.url);
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setBusy(true);
    setError(undefined);
    try {
      const result = await actions.deleteImage({ kind: "staff", staffId });
      if (result.ok) onChange(null);
      else setError(ajustesErrorText(result.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="sr-only">
        {profesionales.campos.fotoLabel}
      </label>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="md"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {url ? perfil.ajustes.botones.cambiar : perfil.ajustes.botones.subir}
        </Button>
        {url ? (
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={busy}
            onClick={() => void handleRemove()}
          >
            {perfil.ajustes.botones.eliminar}
          </Button>
        ) : null}
      </div>
      {error ? (
        <span role="alert" className="text-13 text-ink">
          {error}
        </span>
      ) : null}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={IMAGE_CONTENT_TYPES.join(",")}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}

type RowForm = { name: string; title: string; serviceIds: string[] };
type RowErrors = { name?: string; title?: string };

function toRowForm(s: AjustesStaffMember): RowForm {
  return { name: s.name, title: s.title, serviceIds: s.serviceIds };
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
      <TextField
        label={profesionales.campos.tituloLabel}
        placeholder={profesionales.campos.tituloPlaceholder}
        hint={errors.title ? undefined : profesionales.campos.tituloAyuda}
        value={form.title}
        onChange={(e) => onChange({ ...form, title: e.target.value })}
        error={errors.title}
        maxLength={STAFF_TITLE_MAX}
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

const EMPTY_FORM: RowForm = { name: "", title: "", serviceIds: [] };

export function StaffSection({
  staff,
  services,
  photos,
  actions,
}: {
  staff: AjustesStaffMember[];
  services: AjustesService[];
  /** WP-44: `staffId` → foto-URL, bara de som har ett (`ProfileSettings.staffPhotos`). */
  photos: Record<string, string>;
  actions: {
    create: AjustesActions["createStaff"];
    update: AjustesActions["updateStaff"];
    setActive: AjustesActions["setStaffActive"];
    /** WP-41: rol, guardado aparte (`src/server/owner/profile.ts`
     * `updateStaffTitle`, no `updateStaff`). */
    updateTitle: (
      id: string,
      title: string,
    ) => Promise<{ ok: true } | { ok: false; code: string }>;
  } & StaffPhotoActions;
}) {
  const [list, setList] = useState(staff);
  const [photoUrls, setPhotoUrls] =
    useState<Record<string, string | null>>(photos);
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
    const title = form.title.trim();
    const titleOk = title.length <= STAFF_TITLE_MAX;
    const nextErrors: RowErrors = {};
    if (!name.ok) nextErrors.name = ajustesErrorText(name.code);
    if (!titleOk) nextErrors.title = ajustesErrorText("staff.title_too_long");
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    const payload = { name: form.name.trim(), serviceIds: form.serviceIds };

    setSaving(true);
    try {
      if (editingId === "new") {
        const result = await actions.create(payload);
        if (result.ok) {
          const titleResult = await actions.updateTitle(result.id, title);
          setList((prev) => [
            ...prev,
            {
              id: result.id,
              name: payload.name,
              active: true,
              serviceIds: payload.serviceIds,
              title: titleResult.ok ? title : "",
            },
          ]);
          setEditingId(null);
        } else {
          setErrors({ name: ajustesErrorText(result.code) });
        }
      } else if (editingId) {
        const [result, titleResult] = await Promise.all([
          actions.update(editingId, payload),
          actions.updateTitle(editingId, title),
        ]);
        if (result.ok) {
          setList((prev) =>
            prev.map((s) =>
              s.id === editingId
                ? {
                    ...s,
                    name: payload.name,
                    serviceIds: payload.serviceIds,
                    title: titleResult.ok ? title : s.title,
                  }
                : s,
            ),
          );
          setEditingId(null);
          if (!titleResult.ok) {
            setErrors({ title: ajustesErrorText(titleResult.code) });
          }
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
      const nextActive = !s.active;
      const result = await actions.setActive(s.id, nextActive);
      if (result.ok) {
        setList((prev) =>
          prev.map((x) => (x.id === s.id ? { ...x, active: nextActive } : x)),
        );
        // WP-44/Ley 21.719: servern tar bort fotot när personalen
        // inaktiveras (setStaffActive), så det försvinner härifrån också
        // i stället för att visa en trasig bild.
        if (!nextActive) {
          setPhotoUrls((prev) => ({ ...prev, [s.id]: null }));
        }
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
                "flex flex-col gap-3 rounded-tile bg-canvas p-4 sm:flex-row sm:items-center sm:justify-between",
                !s.active && "opacity-50",
              )}
            >
              {/* 390 px: rad 1 = avatar + namn/tjänster (full bredd), rad 2 = fotoknapparna
               * (granskningsfynd). Från `sm:` samma rad igen (avatar+namn, sen knapparna). */}
              <div className="flex flex-col gap-3 sm:min-w-0 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    initials={initialsOf(s.name)}
                    photoUrl={photoUrls[s.id] ?? null}
                    alt={s.name}
                    size={46}
                    tone="peach"
                  />
                  <div className="min-w-0">
                    <p className="text-15 font-bold text-ink">{s.name}</p>
                    {s.title ? (
                      <p className="text-13 text-muted">{s.title}</p>
                    ) : null}
                    {s.serviceIds.length > 0 ? (
                      <p className="text-13 text-muted">
                        {services
                          .filter((svc) => s.serviceIds.includes(svc.id))
                          .map((svc) => svc.name)
                          .join(", ")}
                      </p>
                    ) : null}
                  </div>
                </div>
                <StaffPhotoButtons
                  staffId={s.id}
                  url={photoUrls[s.id] ?? null}
                  actions={actions}
                  onChange={(url) =>
                    setPhotoUrls((prev) => ({ ...prev, [s.id]: url }))
                  }
                />
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
