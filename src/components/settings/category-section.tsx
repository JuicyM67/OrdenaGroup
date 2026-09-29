"use client";

// Kategorier (`falt-kategorier.html`, WP-40 steg 5, D-031): skapa, döpa om,
// ta bort (bekräftelse), ordna (upp/ner) och välja kategori per tjänst.
// Grupperad lista av tjänster, "Sin categoría" sist. Delar data
// (`BookingFormSettings`) med `BookingFormSection` — samma `reload()`.
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { IconButton } from "@/components/ui/icon-button";
import { TextField } from "@/components/ui/text-field";
import { ajustes, formulario, servicios } from "@/i18n";

import { bookingFormErrorText } from "./booking-form-error-text";
import type {
  BookingFormActions,
  BookingFormCategory,
  BookingFormService,
} from "./booking-form-types";

function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}) {
  const descriptionId = useId();
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 flex items-center justify-center bg-ink/45 p-4">
          <Dialog.Content
            aria-describedby={descriptionId}
            className="flex w-full max-w-sm flex-col gap-4 rounded-panel bg-surface p-6 shadow-popover"
          >
            <div className="flex items-start justify-between">
              <Dialog.Title className="text-17 font-bold text-ink">
                {formulario.categorias.confirmarEliminar.titulo}
              </Dialog.Title>
              <Dialog.Close asChild>
                <IconButton
                  label={formulario.categorias.confirmarEliminar.ctaNo}
                  tone="ghost"
                  size={30}
                >
                  <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
                </IconButton>
              </Dialog.Close>
            </div>
            <Dialog.Description id={descriptionId} className="text-14 text-ink">
              {formulario.categorias.confirmarEliminar.cuerpo}
            </Dialog.Description>
            <div className="mt-1 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => onOpenChange(false)}
              >
                {formulario.categorias.confirmarEliminar.ctaNo}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={submitting}
                onClick={() => void handleConfirm()}
              >
                {formulario.categorias.confirmarEliminar.ctaSi}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function NewCategoryForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (
    name: string,
  ) => Promise<{ ok: true } | { ok: false; code: string }>;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const result = await onCreate(name.trim());
      if (!result.ok) setError(bookingFormErrorText(result.code));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-tile bg-canvas p-4">
      <TextField
        label={formulario.categorias.nameLabel}
        placeholder={formulario.categorias.namePlaceholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error}
        maxLength={60}
        autoFocus
      />
      <div className="flex gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          {ajustes.seguirEditando}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={() => void submit()}
        >
          {saving ? ajustes.guardando : ajustes.guardarCambios}
        </Button>
      </div>
    </div>
  );
}

function RenameCategoryForm({
  category,
  onCancel,
  onRename,
}: {
  category: BookingFormCategory;
  onCancel: () => void;
  onRename: (
    name: string,
  ) => Promise<{ ok: true } | { ok: false; code: string }>;
}) {
  const [name, setName] = useState(category.name);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const result = await onRename(name.trim());
      if (!result.ok) setError(bookingFormErrorText(result.code));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-tile bg-canvas p-4">
      <TextField
        label={formulario.categorias.nameLabel}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error}
        maxLength={60}
        autoFocus
      />
      <div className="flex gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          {ajustes.seguirEditando}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={() => void submit()}
        >
          {saving ? ajustes.guardando : ajustes.guardarCambios}
        </Button>
      </div>
    </div>
  );
}

export type CategorySectionProps = {
  categories: BookingFormCategory[];
  services: BookingFormService[];
  actions: Pick<
    BookingFormActions,
    | "createCategory"
    | "renameCategory"
    | "deleteCategory"
    | "reorderCategories"
    | "setServiceCategory"
  >;
  onReload: () => Promise<void>;
};

export function CategorySection({
  categories,
  services,
  actions,
  onReload,
}: CategorySectionProps) {
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  async function handleCreate(name: string) {
    const result = await actions.createCategory({ name });
    if (result.ok) {
      setCreating(false);
      await onReload();
    }
    return result;
  }

  async function handleRename(categoryId: string, name: string) {
    const result = await actions.renameCategory(categoryId, { name });
    if (result.ok) {
      setRenamingId(null);
      await onReload();
    }
    return result;
  }

  async function handleDelete(categoryId: string) {
    const result = await actions.deleteCategory(categoryId);
    setDeletingId(null);
    if (result.ok) {
      await onReload();
    } else {
      setError(bookingFormErrorText(result.code));
    }
  }

  async function move(categoryId: string, direction: -1 | 1) {
    const ordered = [...categories].sort((a, b) => a.sort - b.sort);
    const index = ordered.findIndex((c) => c.id === categoryId);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    const result = await actions.reorderCategories(next.map((c) => c.id));
    if (result.ok) await onReload();
    else setError(bookingFormErrorText(result.code));
  }

  async function setServiceCategory(
    serviceId: string,
    categoryId: string | null,
  ) {
    const result = await actions.setServiceCategory(serviceId, categoryId);
    if (result.ok) await onReload();
    else setError(bookingFormErrorText(result.code));
  }

  const ordered = [...categories].sort((a, b) => a.sort - b.sort);
  const groups: {
    category: BookingFormCategory | null;
    services: BookingFormService[];
  }[] = [
    ...ordered.map((c) => ({
      category: c,
      services: services.filter((s) => s.categoryId === c.id),
    })),
    { category: null, services: services.filter((s) => s.categoryId === null) },
  ];

  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-18 font-bold text-ink">
            {formulario.categorias.titulo}
          </h2>
          <p className="text-13 text-muted">{formulario.categorias.ayuda}</p>
        </div>
        {!creating ? (
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            {formulario.categorias.ctaNueva}
          </Button>
        ) : null}
      </div>

      {creating ? (
        <NewCategoryForm
          onCancel={() => setCreating(false)}
          onCreate={handleCreate}
        />
      ) : null}

      {error ? (
        <p role="alert" className="text-13 font-semibold text-ink">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {groups.map((group, groupIndex) => (
          <div
            key={group.category?.id ?? "sin-categoria"}
            className="flex flex-col gap-2 rounded-tile bg-canvas p-4"
          >
            {group.category ? (
              renamingId === group.category.id ? (
                <RenameCategoryForm
                  category={group.category}
                  onCancel={() => setRenamingId(null)}
                  onRename={(name) => handleRename(group.category!.id, name)}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <IconButton
                      label={servicios.campos.subirAria}
                      tone="ghost"
                      size={30}
                      disabled={groupIndex === 0}
                      onClick={() => void move(group.category!.id, -1)}
                    >
                      <ChevronUp
                        aria-hidden="true"
                        className="size-4"
                        strokeWidth={2}
                      />
                    </IconButton>
                    <IconButton
                      label={servicios.campos.bajarAria}
                      tone="ghost"
                      size={30}
                      disabled={groupIndex === ordered.length - 1}
                      onClick={() => void move(group.category!.id, 1)}
                    >
                      <ChevronDown
                        aria-hidden="true"
                        className="size-4"
                        strokeWidth={2}
                      />
                    </IconButton>
                  </div>
                  <p className="min-w-0 flex-1 truncate text-15 font-bold text-ink">
                    {group.category.name}
                  </p>
                  <span className="shrink-0 text-12 text-muted">
                    {servicios.contador({ n: group.services.length })}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={() => setRenamingId(group.category!.id)}
                  >
                    {formulario.categorias.ctaRenombrar}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={() => setDeletingId(group.category!.id)}
                  >
                    {formulario.categorias.ctaEliminar}
                  </Button>
                </div>
              )
            ) : (
              <p className="text-13 font-bold text-muted">
                {formulario.categorias.sinAsignar}
              </p>
            )}

            {group.services.length === 0 ? (
              <p className="pl-2 text-13 text-muted">
                {formulario.categorias.vacia}
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {group.services.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-event bg-surface px-3 py-2 text-13",
                      !s.active && "opacity-50",
                    )}
                  >
                    <span className="min-w-0 truncate font-semibold text-ink">
                      {s.name}
                    </span>
                    <select
                      aria-label={servicios.campos.categoryLabel}
                      value={s.categoryId ?? ""}
                      onChange={(e) =>
                        void setServiceCategory(s.id, e.target.value || null)
                      }
                      className="shrink-0 rounded-event border-2 border-transparent bg-canvas px-2 py-1 text-12 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      <option value="">
                        {formulario.categorias.sinAsignar}
                      </option>
                      {ordered.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <ConfirmDeleteDialog
        open={deletingId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}
        onConfirm={() => handleDelete(deletingId!)}
      />
    </Card>
  );
}
