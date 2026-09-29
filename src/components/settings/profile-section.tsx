"use client";

// Sección "Perfil" (WP-41 steg 4): lo que ve el cliente en `/{slug}` — sobre
// nosotros, Instagram, dirección, teléfono, portada/logo y galería. Sin
// referencia *.dc.html para Ajustes (mismo caso que las demás secciones,
// ver `ajustes-screen.tsx`): un solo `Card` por bloque, mismo formspråk.
//
// Subida de imágenes (plan WP-41, paso 2): `createImageUpload` firma una URL
// de Storage, el cliente sube el archivo directo con
// `uploadToSignedUrl(path, token, file)` (@supabase/supabase-js) y
// `confirmImageUpload` valida el objeto ya subido y guarda la fila/columna.
// Solo la ficha `<input>`/subida usa el cliente Supabase (auth ya iniciada,
// D-019) — el resto del formulario son server actions normales.
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { Textarea } from "@/components/ui/textarea";
import { ajustes, negocio, perfil } from "@/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  ABOUT_MAX,
  IMAGE_CONTENT_TYPES,
  IMAGE_MAX_BYTES,
  MEDIA_BUCKET,
  type ImageContentType,
} from "@/lib/validation/profile";

import { ajustesErrorText } from "./error-text";
import type {
  ImageKind,
  ProfileActions,
  ProfileSettingsData,
} from "./profile-types";

type FormState = {
  about: string;
  instagram: string;
  address: string;
  phone: string;
};

function toFormState(p: ProfileSettingsData): FormState {
  return {
    about: p.about,
    instagram: p.instagram,
    address: p.address,
    phone: p.phone,
  };
}

function isImageContentType(t: string): t is ImageContentType {
  return (IMAGE_CONTENT_TYPES as readonly string[]).includes(t);
}

/** Sube un archivo ya validado y devuelve la URL pública final, o `null`. */
async function uploadImage(
  file: File,
  kind: ImageKind,
  actions: Pick<ProfileActions, "createImageUpload" | "confirmImageUpload">,
): Promise<{ url: string; imageId?: string } | { code: string }> {
  if (!isImageContentType(file.type)) {
    return { code: "profile.image_type_invalid" };
  }
  if (file.size > IMAGE_MAX_BYTES) return { code: "profile.image_too_large" };

  const ticket = await actions.createImageUpload({
    kind,
    contentType: file.type,
    size: file.size,
  });
  if (!ticket.ok) return { code: ticket.code };

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .uploadToSignedUrl(ticket.path, ticket.token, file);
  if (error) return { code: "profile.upload_failed" };

  const confirmed = await actions.confirmImageUpload({
    kind,
    path: ticket.path,
  });
  if (!confirmed.ok) return { code: confirmed.code };
  return { url: confirmed.url, imageId: confirmed.imageId };
}

function SingleImageField({
  label,
  help,
  url,
  kind,
  actions,
  onChange,
}: {
  label: string;
  help: string;
  url: string | null;
  kind: "cover" | "logo";
  actions: ProfileActions;
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
      const result = await uploadImage(file, kind, actions);
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
      const result = await actions.deleteImage({ kind });
      if (result.ok) onChange(null);
      else setError(ajustesErrorText(result.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-13 font-semibold text-ink">
        {label}
      </label>
      <span className="text-13 text-muted">{help}</span>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- previsualización en Ajustes (JS-budget del cliente no aplica acá).
        <img
          src={url}
          alt=""
          className="h-32 w-full max-w-90 rounded-tile object-cover"
        />
      ) : null}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {url ? perfil.ajustes.botones.cambiar : perfil.ajustes.botones.subir}
        </Button>
        {url ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => void handleRemove()}
          >
            {perfil.ajustes.botones.eliminar}
          </Button>
        ) : null}
      </div>
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
      {error ? (
        <span role="alert" className="text-13 text-ink">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function GalleryField({
  images,
  actions,
  onChange,
}: {
  images: { id: string; url: string }[];
  actions: ProfileActions;
  onChange: (images: { id: string; url: string }[]) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleFiles(files: FileList) {
    setBusy(true);
    setError(undefined);
    let current = images;
    for (const file of Array.from(files)) {
      if (current.length >= 12) {
        setError(ajustesErrorText("profile.gallery_full"));
        break;
      }
      const result = await uploadImage(file, "gallery", actions);
      if ("code" in result) {
        setError(ajustesErrorText(result.code));
        break;
      }
      current = [
        ...current,
        { id: result.imageId ?? result.url, url: result.url },
      ];
      onChange(current);
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleRemove(id: string) {
    setBusy(true);
    setError(undefined);
    try {
      const result = await actions.deleteImage({ kind: "gallery", id });
      if (result.ok) onChange(images.filter((img) => img.id !== id));
      else setError(ajustesErrorText(result.code));
    } finally {
      setBusy(false);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(target, 0, moved);
    onChange(next);
    const result = await actions.reorderImages(next.map((img) => img.id));
    if (!result.ok) {
      onChange(images);
      setError(ajustesErrorText(result.code));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-13 font-semibold text-ink">
        {perfil.ajustes.campos.galeriaLabel}
      </label>
      <span className="text-13 text-muted">
        {perfil.ajustes.campos.galeriaAyuda}
      </span>
      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {images.map((img, i) => (
            <div key={img.id} className="flex flex-col gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- previsualización en Ajustes. */}
              <img
                src={img.url}
                alt=""
                className="h-24 w-full rounded-tile object-cover"
              />
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  disabled={busy || i === 0}
                  aria-label={perfil.ajustes.botones.moverArriba}
                  onClick={() => void handleMove(i, -1)}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  disabled={busy || i === images.length - 1}
                  aria-label={perfil.ajustes.botones.moverAbajo}
                  onClick={() => void handleMove(i, 1)}
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  disabled={busy}
                  onClick={() => void handleRemove(img.id)}
                >
                  {perfil.ajustes.botones.eliminar}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy || images.length >= 12}
          onClick={() => inputRef.current?.click()}
        >
          {perfil.ajustes.botones.subir}
        </Button>
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        accept={IMAGE_CONTENT_TYPES.join(",")}
        className="sr-only"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) void handleFiles(files);
        }}
      />
      {error ? (
        <span role="alert" className="text-13 text-ink">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function ProfileSection({
  data,
  actions,
}: {
  data: ProfileSettingsData;
  actions: ProfileActions;
}) {
  const [profile, setProfile] = useState(data);
  const [form, setForm] = useState<FormState>(() => toFormState(data));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [submitError, setSubmitError] = useState<string | undefined>();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setSubmitError(undefined);
    try {
      const result = await actions.updateBusinessProfile(form);
      if (result.ok) {
        setStatus("saved");
      } else {
        setStatus("error");
        setSubmitError(ajustesErrorText(result.code));
      }
    } catch {
      setStatus("error");
      setSubmitError(ajustesErrorText("unknown"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={(e) => void handleSubmit(e)}>
        <Card radius="tile" padding="lg" className="flex flex-col gap-4">
          <div>
            <h2 className="text-18 font-bold text-ink">
              {perfil.ajustes.titulo}
            </h2>
            <p className="mt-1 text-13 text-muted">{perfil.ajustes.ayuda}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Textarea
              label={perfil.ajustes.campos.sobreNosotrosLabel}
              placeholder={perfil.ajustes.campos.sobreNosotrosPlaceholder}
              hint={perfil.ajustes.campos.sobreNosotrosAyuda}
              value={form.about}
              onChange={(e) => set("about", e.target.value)}
              maxLength={ABOUT_MAX}
              rows={4}
            />
            <span className="self-end text-13 text-muted">
              {form.about.length}/{ABOUT_MAX}
            </span>
          </div>

          <TextField
            label={perfil.ajustes.campos.instagramLabel}
            placeholder={perfil.ajustes.campos.instagramPlaceholder}
            hint={perfil.ajustes.campos.instagramAyuda}
            value={form.instagram}
            onChange={(e) => set("instagram", e.target.value)}
            maxLength={30}
          />

          <TextField
            label={negocio.campos.addressLabel}
            placeholder={negocio.campos.addressPlaceholder}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            maxLength={200}
          />

          <TextField
            label={negocio.campos.phoneLabel}
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />

          {submitError ? (
            <p role="alert" className="text-13 font-semibold text-ink">
              {submitError}
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <Button type="submit" size="xl" disabled={status === "saving"}>
              {status === "saving" ? ajustes.guardando : ajustes.guardarCambios}
            </Button>
            {status === "saved" ? (
              <span role="status" className="text-13 text-muted">
                {ajustes.cambiosGuardados}
              </span>
            ) : null}
          </div>
        </Card>
      </form>

      <Card radius="tile" padding="lg" className="flex flex-col gap-4">
        <SingleImageField
          label={perfil.ajustes.campos.portadaLabel}
          help={perfil.ajustes.campos.portadaAyuda}
          url={profile.coverUrl}
          kind="cover"
          actions={actions}
          onChange={(url) => setProfile((p) => ({ ...p, coverUrl: url }))}
        />
        <SingleImageField
          label={perfil.ajustes.campos.logoLabel}
          help={perfil.ajustes.campos.logoAyuda}
          url={profile.logoUrl}
          kind="logo"
          actions={actions}
          onChange={(url) => setProfile((p) => ({ ...p, logoUrl: url }))}
        />
        <GalleryField
          images={profile.gallery}
          actions={actions}
          onChange={(gallery) => setProfile((p) => ({ ...p, gallery }))}
        />
      </Card>
    </div>
  );
}
