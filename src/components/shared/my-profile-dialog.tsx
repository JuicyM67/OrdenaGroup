"use client";

// "Min profil" (WP-46 steg 6): inloggad personal (och en ägare med egen
// personalrad) kan byta sin EGEN profilbild och titel, öppnat från
// kontomenyn (`UserMenu`). Samma tre-stegs uppladdning som
// `src/components/settings/upload-image.ts` (signera/ladda upp/bekräfta),
// men skrivet direkt här i stället för att återanvända den delade
// hjälparen: `src/server/team/profile.ts`s actions tar inget `kind`-fält
// (redan avgränsat till "eget foto"), annan form än
// `UploadImageActions`.
//
// TODO_COPY (copywriter-es-cl): ingen sträng finns än för rubriken
// "Mi perfil"/menyposten i `src/i18n/es-CL.ts` — platshållare nedan
// (`MI_PERFIL_TODO`), nämnt i rapporten till uppdragsgivaren.
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { TextField } from "@/components/ui/text-field";
import { ajustes, comun, perfil, profesionales } from "@/i18n";
import { initialsOf } from "@/lib/format/initials";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  IMAGE_CONTENT_TYPES,
  IMAGE_MAX_BYTES,
  MEDIA_BUCKET,
  STAFF_TITLE_MAX,
  type ImageContentType,
} from "@/lib/validation/profile";

/** TODO_COPY: ersätt med en riktig sträng (`perfil.miPerfil` e.d.) när
 * copywriter-es-cl lagt till den. */
const MI_PERFIL_TODO = "Mi perfil";

export type MyProfileData = {
  staffId: string;
  name: string;
  title: string;
  photoUrl: string | null;
};

export type MyProfileActions = {
  updateTitle: (title: string) => Promise<{ ok: true } | { ok: false; code: string }>;
  createPhotoUpload: (
    contentType: string,
  ) => Promise<
    | { ok: true; path: string; signedUrl: string; token: string }
    | { ok: false; code: string }
  >;
  confirmPhotoUpload: (
    path: string,
  ) => Promise<{ ok: true; url: string } | { ok: false; code: string }>;
  deletePhoto: () => Promise<{ ok: true } | { ok: false; code: string }>;
};

export type MyProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: MyProfileData;
  actions: MyProfileActions;
};

function isImageContentType(t: string): t is ImageContentType {
  return (IMAGE_CONTENT_TYPES as readonly string[]).includes(t);
}

export function MyProfileDialog({
  open,
  onOpenChange,
  profile,
  actions,
}: MyProfileDialogProps) {
  const descriptionId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | undefined>();

  const [title, setTitle] = useState(profile.title);
  const [savingTitle, setSavingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | undefined>();
  const [titleSaved, setTitleSaved] = useState(false);

  async function handleFile(file: File) {
    if (!isImageContentType(file.type)) {
      setPhotoError(perfil.ajustes.errores.tipoInvalido);
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setPhotoError(perfil.ajustes.errores.demasiadoGrande);
      return;
    }
    setPhotoBusy(true);
    setPhotoError(undefined);
    try {
      const ticket = await actions.createPhotoUpload(file.type);
      if (!ticket.ok) {
        setPhotoError(perfil.ajustes.errores.subidaFallida);
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, file);
      if (error) {
        setPhotoError(perfil.ajustes.errores.subidaFallida);
        return;
      }
      const confirmed = await actions.confirmPhotoUpload(ticket.path);
      if (!confirmed.ok) {
        setPhotoError(perfil.ajustes.errores.subidaFallida);
        return;
      }
      setPhotoUrl(confirmed.url);
    } finally {
      setPhotoBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemovePhoto() {
    setPhotoBusy(true);
    setPhotoError(undefined);
    try {
      const result = await actions.deletePhoto();
      if (result.ok) setPhotoUrl(null);
      else setPhotoError(perfil.ajustes.errores.subidaFallida);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleSaveTitle() {
    if (title.trim().length > STAFF_TITLE_MAX) return;
    setSavingTitle(true);
    setTitleError(undefined);
    setTitleSaved(false);
    try {
      const result = await actions.updateTitle(title.trim());
      if (result.ok) setTitleSaved(true);
      else setTitleError(comun.algoSalioMal);
    } finally {
      setSavingTitle(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 flex items-center justify-center overflow-y-auto bg-ink/45 p-4">
          <Dialog.Content
            aria-describedby={descriptionId}
            className="flex w-full max-w-sm flex-col gap-4 rounded-panel bg-surface p-6 shadow-popover"
          >
            <div className="flex items-start justify-between">
              <Dialog.Title className="text-17 font-bold text-ink">
                {MI_PERFIL_TODO}
              </Dialog.Title>
              <Dialog.Close asChild>
                <IconButton label={comun.cerrar} tone="ghost" size={30}>
                  <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
                </IconButton>
              </Dialog.Close>
            </div>
            <Dialog.Description id={descriptionId} className="sr-only">
              {MI_PERFIL_TODO}
            </Dialog.Description>

            <div className="flex items-center gap-4">
              <Avatar
                initials={initialsOf(profile.name)}
                photoUrl={photoUrl}
                alt={profile.name}
                size={56}
                tone="peach"
              />
              <div className="flex flex-col gap-2">
                <label htmlFor={inputId} className="sr-only">
                  {profesionales.campos.fotoLabel}
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    disabled={photoBusy}
                    onClick={() => inputRef.current?.click()}
                  >
                    {photoUrl
                      ? perfil.ajustes.botones.cambiar
                      : perfil.ajustes.botones.subir}
                  </Button>
                  {photoUrl ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      disabled={photoBusy}
                      onClick={() => void handleRemovePhoto()}
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
              </div>
            </div>
            {photoError ? (
              <span role="alert" className="text-13 text-ink">
                {photoError}
              </span>
            ) : null}

            <TextField
              label={profesionales.campos.tituloLabel}
              placeholder={profesionales.campos.tituloPlaceholder}
              hint={titleError ? undefined : profesionales.campos.tituloAyuda}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleSaved(false);
              }}
              error={titleError}
              maxLength={STAFF_TITLE_MAX}
            />
            {titleSaved ? (
              <span role="status" className="text-13 text-ink">
                {ajustes.cambiosGuardados}
              </span>
            ) : null}

            <div className="mt-1 flex justify-end">
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={savingTitle}
                onClick={() => void handleSaveTitle()}
              >
                {savingTitle ? ajustes.guardando : ajustes.guardarCambios}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
