"use client";

// Ajustes → Equipo (WP-46 steg 6, D-034; WP-55: egen flik, `/app/ajustes/equipo`).
//
// UX-granskning (ägarens genomgång 2026-10-01, sektionerna "Fel jag hittade" punkt 4 och
// "Inställningar"): sammanslagen till EN lista, en rad per person — innan låg "Personal"
// (namn/titel/tjänster/foto, `StaffSection`) och "Åtkomst till kontot" (kontostatus/
// behörigheter, `TeamSection`) som två separata kort, och rad-knapparna var fyra på en rad.
// Nu: avatar, namn, titel/antal tjänster, en kontostatus-chip och en "…"-meny (Redigera,
// Foto, Behörigheter/Bjud in beroende på kontostatus, Inaktivera). "+ Lägg till
// medarbetare" i huvudet (skapar en ny personalrad — skiljer sig från "Bjud in", som ger en
// BEFINTLIG personalrad ett konto). Planinfo (fel 4: konton ≠ medarbetare) som ett diskret
// kort under listan, inte en varning som blockerar.
//
// `team` är `null` för alla som inte är ägaren (`AjustesEquipoPage` skickar bara `team`/
// `teamActions` när `ctx.current.view.role === "owner"`, samma villkor som servern kräver i
// `src/server/team/members.ts`) — kontochip och kontorelaterade menyrader (Behörigheter/
// Bjud in/Reenviar/Revocar) döljs då, men Redigera/Foto/Inaktivera finns kvar (styrs av
// `can_manage_team`, inte `role === "owner"`).
import { useId, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Ellipsis, X } from "lucide-react";

import { validateRequired } from "@/components/onboarding/client-validation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { strokeCard } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Menu, MenuButtonItem } from "@/components/ui/menu";
import { Pill } from "@/components/ui/pill";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import {
  ajustes,
  comun,
  equipo,
  nav,
  perfil,
  profesionales,
  servicios,
} from "@/i18n";
import { initialsOf } from "@/lib/format/initials";
import { IMAGE_CONTENT_TYPES, STAFF_TITLE_MAX } from "@/lib/validation/profile";

import { ajustesErrorText } from "./error-text";
import type { ProfileActions } from "./profile-types";
import { uploadImage } from "./upload-image";
import type {
  AjustesActions,
  AjustesService,
  AjustesStaffMember,
  TeamAccount,
  TeamData,
  TeamInviteResult,
} from "./types";

export type TeamPerms = {
  can_manage_own_bookings: boolean;
  can_manage_all_bookings: boolean;
  can_cancel_bookings: boolean;
  can_edit_catalog: boolean;
  can_manage_team: boolean;
  can_view_reports: boolean;
  can_edit_settings: boolean;
  can_view_records: boolean;
};

type MutationResult = { ok: true } | { ok: false; code: string };

export type TeamActions = {
  onInvite: (input: {
    email: string;
    staffId: string;
    flags: TeamPerms;
  }) => Promise<TeamInviteResult>;
  onResend: (invitationId: string) => Promise<MutationResult>;
  onRevoke: (invitationId: string) => Promise<MutationResult>;
  onUpdatePerms: (
    targetUserId: string,
    perms: TeamPerms,
  ) => Promise<MutationResult>;
  onRemoveAccess: (targetUserId: string) => Promise<MutationResult>;
};

/** WP-44: foto, gratis i alla planer. Samma uppladdningsflöde som
 * omslag/logo (profile-section.tsx → ./upload-image.ts), bara `kind: "staff"`
 * och `staffId` i stället för `kind: "cover" | "logo"`. */
type StaffPhotoActions = Pick<
  ProfileActions,
  "createImageUpload" | "confirmImageUpload" | "deleteImage"
>;

export type TeamSectionProps = {
  staff: AjustesStaffMember[];
  services: AjustesService[];
  /** WP-44: `staffId` → foto-URL, bara de som har ett (`ProfileSettings.staffPhotos`). */
  photos: Record<string, string>;
  staffActions: {
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
  /** `null` → inte ägaren, se filkommentaren. */
  team: TeamData | null;
  teamActions?: TeamActions;
  /** Refresca `team` tras una mutación de cuenta (server action + reload, mismo patrón que
   * `reloadAjustesData` en `./actions.ts`). */
  onReloadTeam?: () => Promise<TeamData | null>;
};

// ---------------------------------------------------------------------------
// Permisos (checkbox por bandera) — reutilizado por EditPermsDialog e InviteDialog.
// ---------------------------------------------------------------------------

const PERM_ROWS: {
  perm: keyof TeamPerms;
  key: keyof typeof equipo.permisos;
}[] = [
  { perm: "can_manage_own_bookings", key: "manage_own_bookings" },
  { perm: "can_manage_all_bookings", key: "manage_all_bookings" },
  { perm: "can_cancel_bookings", key: "cancel_bookings" },
  { perm: "can_edit_catalog", key: "edit_catalog" },
  { perm: "can_manage_team", key: "manage_team" },
  { perm: "can_view_reports", key: "view_reports" },
  { perm: "can_edit_settings", key: "edit_settings" },
  { perm: "can_view_records", key: "view_records" },
];

const DEFAULT_PERMS: TeamPerms = {
  can_manage_own_bookings: true,
  can_manage_all_bookings: false,
  can_cancel_bookings: false,
  can_edit_catalog: false,
  can_manage_team: false,
  can_view_reports: false,
  can_edit_settings: false,
  can_view_records: false,
};

function PermSwitches({
  value,
  onChange,
  disabled,
}: {
  value: TeamPerms;
  onChange: (next: TeamPerms) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {PERM_ROWS.map(({ perm, key }) => {
        const copy = equipo.permisos[key];
        return (
          <div key={perm} className="flex items-start justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-14 font-semibold text-ink">
                {copy.nombre}
              </span>
              <span className="text-13 text-muted">{copy.ayuda}</span>
            </div>
            <Switch
              checked={value[perm]}
              disabled={disabled}
              label={copy.nombre}
              onChange={(checked) => onChange({ ...value, [perm]: checked })}
            />
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bjud in (en fila, "Bjud in" i "…"-menyn — profesionalen är redan vald)
// ---------------------------------------------------------------------------

function InviteDialog({
  open,
  onOpenChange,
  staffId,
  staffName,
  onInvite,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  staffName: string;
  onInvite: TeamActions["onInvite"];
  onInvited: () => void;
}) {
  const descriptionId = useId();
  const [email, setEmail] = useState("");
  const [flags, setFlags] = useState<TeamPerms>(DEFAULT_PERMS);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; general?: string }>(
    {},
  );

  function reset() {
    setEmail("");
    setFlags(DEFAULT_PERMS);
    setErrors({});
  }

  async function submit() {
    if (email.trim() === "") {
      setErrors({ email: equipo.invitarDialog.errores.emailInvalido });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const result = await onInvite({ email: email.trim(), staffId, flags });
      if (result.ok) {
        reset();
        onOpenChange(false);
        onInvited();
      } else if (result.code === "invitation.email_invalid") {
        setErrors({ email: ajustesErrorText(result.code) });
      } else {
        setErrors({ general: ajustesErrorText(result.code) });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 flex items-center justify-center overflow-y-auto bg-ink/45 p-4">
          <Dialog.Content
            aria-describedby={descriptionId}
            className="flex w-full max-w-md flex-col gap-4 rounded-panel bg-surface p-6 shadow-popover"
          >
            <div className="flex items-start justify-between">
              <Dialog.Title className="text-17 font-bold text-ink">
                {equipo.invitarDialog.titulo}
              </Dialog.Title>
              <Dialog.Close asChild>
                <IconButton label={comun.cerrar} tone="ghost" size={30}>
                  <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
                </IconButton>
              </Dialog.Close>
            </div>
            <Dialog.Description id={descriptionId} className="sr-only">
              {equipo.invitarDialog.titulo}
            </Dialog.Description>

            <p className="text-13 text-muted">
              {equipo.invitarDialog.profesionalAyuda}
            </p>
            <p className="text-15 font-bold text-ink">{staffName}</p>

            <TextField
              label={equipo.invitarDialog.emailLabel}
              placeholder={equipo.invitarDialog.emailPlaceholder}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              maxLength={254}
            />

            <div className="flex flex-col gap-2">
              <span className="text-15 font-bold text-ink">
                {equipo.invitarDialog.permisosTitulo}
              </span>
              <PermSwitches
                value={flags}
                onChange={setFlags}
                disabled={saving}
              />
            </div>

            {errors.general ? (
              <p role="alert" className="text-13 text-ink">
                {errors.general}
              </p>
            ) : null}

            <div className="mt-1 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => onOpenChange(false)}
              >
                {ajustes.seguirEditando}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={saving}
                onClick={() => void submit()}
              >
                {equipo.invitarDialog.ctaEnviar}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Behörigheter (konto redan aktivt)
// ---------------------------------------------------------------------------

function EditPermsDialog({
  staffName,
  initial,
  open,
  onOpenChange,
  onUpdatePerms,
  onSaved,
}: {
  staffName: string;
  initial: TeamPerms;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdatePerms: (perms: TeamPerms) => Promise<MutationResult>;
  onSaved: () => void;
}) {
  const [flags, setFlags] = useState<TeamPerms>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next) setFlags(initial);
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 flex items-center justify-center overflow-y-auto bg-ink/45 p-4">
          <Dialog.Content className="flex w-full max-w-md flex-col gap-4 rounded-panel bg-surface p-6 shadow-popover">
            <div className="flex items-start justify-between">
              <Dialog.Title className="text-17 font-bold text-ink">
                {staffName}
              </Dialog.Title>
              <Dialog.Close asChild>
                <IconButton label={comun.cerrar} tone="ghost" size={30}>
                  <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
                </IconButton>
              </Dialog.Close>
            </div>
            <PermSwitches value={flags} onChange={setFlags} disabled={saving} />
            {error ? (
              <p role="alert" className="text-13 text-ink">
                {error}
              </p>
            ) : null}
            <div className="mt-1 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => onOpenChange(false)}
              >
                {ajustes.seguirEditando}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  setError(undefined);
                  try {
                    const result = await onUpdatePerms(flags);
                    if (result.ok) {
                      onOpenChange(false);
                      onSaved();
                    } else {
                      setError(ajustesErrorText(result.code));
                    }
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? ajustes.guardando : ajustes.guardarCambios}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Redigera/Lägg till medarbetare (namn, titel, tjänster)
// ---------------------------------------------------------------------------

type RowForm = { name: string; title: string; serviceIds: string[] };
type RowErrors = { name?: string; title?: string };

function toRowForm(s: AjustesStaffMember): RowForm {
  return { name: s.name, title: s.title, serviceIds: s.serviceIds };
}

function StaffDialog({
  mode,
  initial,
  services,
  open,
  onOpenChange,
  onSubmit,
}: {
  mode: "new" | "edit";
  initial: RowForm;
  services: AjustesService[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    form: RowForm,
  ) => Promise<{ ok: true } | { ok: false; errors: RowErrors }>;
}) {
  const [form, setForm] = useState<RowForm>(initial);
  const [errors, setErrors] = useState<RowErrors>({});
  const [saving, setSaving] = useState(false);

  function toggleService(serviceId: string) {
    const has = form.serviceIds.includes(serviceId);
    setForm((f) => ({
      ...f,
      serviceIds: has
        ? f.serviceIds.filter((id) => id !== serviceId)
        : [...f.serviceIds, serviceId],
    }));
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setForm(initial);
          setErrors({});
        }
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 flex items-center justify-center overflow-y-auto bg-ink/45 p-4">
          <Dialog.Content className="flex w-full max-w-md flex-col gap-4 rounded-panel bg-surface p-6 shadow-popover">
            <div className="flex items-start justify-between">
              <Dialog.Title className="text-17 font-bold text-ink">
                {mode === "new"
                  ? profesionales.ctaAgregar
                  : form.name || initial.name}
              </Dialog.Title>
              <Dialog.Close asChild>
                <IconButton label={comun.cerrar} tone="ghost" size={30}>
                  <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
                </IconButton>
              </Dialog.Close>
            </div>

            <TextField
              label={profesionales.campos.nameLabel}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
              maxLength={120}
            />
            <TextField
              label={profesionales.campos.tituloLabel}
              placeholder={profesionales.campos.tituloPlaceholder}
              hint={errors.title ? undefined : profesionales.campos.tituloAyuda}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
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

            <div className="mt-1 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => onOpenChange(false)}
              >
                {ajustes.seguirEditando}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={saving}
                onClick={async () => {
                  const name = validateRequired(form.name, "staff.name_empty");
                  const title = form.title.trim();
                  const titleOk = title.length <= STAFF_TITLE_MAX;
                  const nextErrors: RowErrors = {};
                  if (!name.ok) nextErrors.name = ajustesErrorText(name.code);
                  if (!titleOk)
                    nextErrors.title = ajustesErrorText("staff.title_too_long");
                  if (Object.keys(nextErrors).length > 0) {
                    setErrors(nextErrors);
                    return;
                  }
                  setErrors({});
                  setSaving(true);
                  try {
                    const result = await onSubmit({
                      name: form.name.trim(),
                      title,
                      serviceIds: form.serviceIds,
                    });
                    if (result.ok) onOpenChange(false);
                    else setErrors(result.errors);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? ajustes.guardando : ajustes.guardarCambios}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Foto (dialog runt StaffPhotoButtons — samma uppladdningsflöde som förut)
// ---------------------------------------------------------------------------

function PhotoDialog({
  staffId,
  staffName,
  url,
  actions,
  open,
  onOpenChange,
  onChange,
}: {
  staffId: string;
  staffName: string;
  url: string | null;
  actions: StaffPhotoActions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
      if ("code" in result) setError(ajustesErrorText(result.code));
      else onChange(result.url);
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 flex items-center justify-center overflow-y-auto bg-ink/45 p-4">
          <Dialog.Content className="flex w-full max-w-sm flex-col gap-4 rounded-panel bg-surface p-6 shadow-popover">
            <div className="flex items-start justify-between">
              <Dialog.Title className="text-17 font-bold text-ink">
                {staffName}
              </Dialog.Title>
              <Dialog.Close asChild>
                <IconButton label={comun.cerrar} tone="ghost" size={30}>
                  <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
                </IconButton>
              </Dialog.Close>
            </div>
            <label htmlFor={inputId} className="sr-only">
              {profesionales.campos.fotoLabel}
            </label>
            <div className="flex items-center gap-4">
              <Avatar
                initials={initialsOf(staffName)}
                photoUrl={url}
                alt={staffName}
                size={56}
                tone="peach"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={busy}
                  onClick={() => inputRef.current?.click()}
                >
                  {url
                    ? perfil.ajustes.botones.cambiar
                    : perfil.ajustes.botones.subir}
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
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Kontostatus-chip
// ---------------------------------------------------------------------------

function AccountChip({ account }: { account: TeamAccount }) {
  if (account.status === "active") {
    return (
      <Chip tone="success" size="sm">
        {equipo.estadoCuenta.activa}
      </Chip>
    );
  }
  if (account.status === "pending") {
    return (
      <Chip tone="pending" size="sm">
        {equipo.estadoCuenta.invitada}
      </Chip>
    );
  }
  return (
    <Chip tone="neutral" size="sm">
      {equipo.estadoCuenta.ninguna}
    </Chip>
  );
}

// ---------------------------------------------------------------------------
// Sección completa
// ---------------------------------------------------------------------------

const EMPTY_FORM: RowForm = { name: "", title: "", serviceIds: [] };

export function TeamSection({
  staff,
  services,
  photos,
  staffActions,
  team: initialTeam,
  teamActions,
  onReloadTeam,
}: TeamSectionProps) {
  const [list, setList] = useState(staff);
  const [photoUrls, setPhotoUrls] =
    useState<Record<string, string | null>>(photos);
  const [team, setTeam] = useState(initialTeam);

  const [dialogTarget, setDialogTarget] = useState<
    { mode: "new" } | { mode: "edit"; staffId: string } | null
  >(null);
  const [photoTarget, setPhotoTarget] = useState<string | null>(null);
  const [permsTarget, setPermsTarget] = useState<string | null>(null);
  const [inviteTarget, setInviteTarget] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function refreshTeam() {
    if (!onReloadTeam) return;
    const next = await onReloadTeam();
    if (next) setTeam(next);
  }

  function accountOf(staffId: string): TeamAccount {
    return (
      team?.staff.find((t) => t.staffId === staffId)?.account ?? {
        status: "none",
      }
    );
  }

  async function toggleActive(s: AjustesStaffMember) {
    setPendingId(s.id);
    try {
      const nextActive = !s.active;
      const result = await staffActions.setActive(s.id, nextActive);
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

  const dialogStaff =
    dialogTarget?.mode === "edit"
      ? (list.find((s) => s.id === dialogTarget.staffId) ?? null)
      : null;
  const photoStaff = list.find((s) => s.id === photoTarget) ?? null;
  const permsStaff = list.find((s) => s.id === permsTarget) ?? null;
  const permsAccount = permsStaff ? accountOf(permsStaff.id) : null;
  const inviteStaff = list.find((s) => s.id === inviteTarget) ?? null;
  const removeStaff = list.find((s) => s.id === removeTarget) ?? null;

  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-18 font-bold text-ink">
          {ajustes.secciones.equipo}
        </h2>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => setDialogTarget({ mode: "new" })}
        >
          {profesionales.ctaAgregar}
        </Button>
      </div>

      {toast ? (
        <p role="status" className="text-13 text-ink">
          {toast}
        </p>
      ) : null}

      {list.length === 0 ? (
        <p className="text-13 text-muted">{profesionales.vacio}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((s) => {
            const account = accountOf(s.id);
            const canInvite =
              team != null && !team.planLimitReached && teamActions != null;
            return (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-3 rounded-tile bg-canvas p-4",
                  !s.active && "opacity-50",
                )}
              >
                <Avatar
                  initials={initialsOf(s.name)}
                  photoUrl={photoUrls[s.id] ?? null}
                  alt={s.name}
                  size={46}
                  tone="peach"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-15 font-bold text-ink">
                    {s.name}
                  </p>
                  <p className="truncate text-13 text-muted">
                    {[
                      s.title || null,
                      s.serviceIds.length > 0
                        ? servicios.contador({ n: s.serviceIds.length })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {team ? <AccountChip account={account} /> : null}
                <Menu
                  label={nav.masOpciones}
                  trigger={
                    <IconButton
                      label={nav.masOpciones}
                      tone="ghost"
                      size={36}
                      className="text-muted"
                    >
                      <Ellipsis
                        aria-hidden="true"
                        className="size-5"
                        strokeWidth={strokeCard}
                      />
                    </IconButton>
                  }
                >
                  <MenuButtonItem
                    onClick={() =>
                      setDialogTarget({ mode: "edit", staffId: s.id })
                    }
                  >
                    {comun.editar}
                  </MenuButtonItem>
                  <MenuButtonItem onClick={() => setPhotoTarget(s.id)}>
                    {profesionales.ctaFoto}
                  </MenuButtonItem>
                  {team && teamActions && account.status === "active" ? (
                    <MenuButtonItem onClick={() => setPermsTarget(s.id)}>
                      {equipo.ctaPermisos}
                    </MenuButtonItem>
                  ) : null}
                  {team &&
                  teamActions &&
                  account.status === "none" &&
                  canInvite ? (
                    <MenuButtonItem onClick={() => setInviteTarget(s.id)}>
                      {equipo.ctaInvitar}
                    </MenuButtonItem>
                  ) : null}
                  {team && teamActions && account.status === "pending" ? (
                    <MenuButtonItem
                      disabled={pendingId === account.invitationId}
                      onClick={() => {
                        const invitationId = account.invitationId;
                        setPendingId(invitationId);
                        void teamActions
                          .onResend(invitationId)
                          .then((r) => {
                            if (r.ok) {
                              setToast(equipo.invitaciones.toast.reenviada);
                              void refreshTeam();
                            }
                          })
                          .finally(() => setPendingId(null));
                      }}
                    >
                      {equipo.invitaciones.ctaReenviar}
                    </MenuButtonItem>
                  ) : null}
                  {team && teamActions && account.status === "pending" ? (
                    <MenuButtonItem onClick={() => setRemoveTarget(s.id)}>
                      {equipo.invitaciones.ctaRevocar}
                    </MenuButtonItem>
                  ) : null}
                  {team && teamActions && account.status === "active" ? (
                    <MenuButtonItem onClick={() => setRemoveTarget(s.id)}>
                      {equipo.miembros.ctaQuitarAcceso}
                    </MenuButtonItem>
                  ) : null}
                  <MenuButtonItem
                    disabled={pendingId === s.id}
                    onClick={() => void toggleActive(s)}
                  >
                    {s.active
                      ? profesionales.ctaDesactivar
                      : profesionales.ctaActivar}
                  </MenuButtonItem>
                </Menu>
              </div>
            );
          })}
        </div>
      )}

      {team ? (
        <div className="flex flex-col gap-1 rounded-tile bg-canvas p-4">
          <p className="text-14 font-bold text-ink">
            {equipo.limiteDelPlan.titulo}
          </p>
          <p className="text-13 text-muted">
            {team.planLimitReached
              ? team.seatLimit <= 1
                ? equipo.limiteDelPlan.texto({ limit: team.seatLimit })
                : equipo.infoDelPlan.completo({ limit: team.seatLimit })
              : equipo.infoDelPlan.conEspacio({
                  used: team.seatsUsed,
                  limit: team.seatLimit,
                })}
          </p>
        </div>
      ) : null}

      <StaffDialog
        mode={dialogTarget?.mode ?? "new"}
        initial={dialogStaff ? toRowForm(dialogStaff) : EMPTY_FORM}
        services={services}
        open={dialogTarget != null}
        onOpenChange={(open) => {
          if (!open) setDialogTarget(null);
        }}
        onSubmit={async (form) => {
          const payload = { name: form.name, serviceIds: form.serviceIds };
          if (dialogTarget?.mode === "edit") {
            const [result, titleResult] = await Promise.all([
              staffActions.update(dialogTarget.staffId, payload),
              staffActions.updateTitle(dialogTarget.staffId, form.title),
            ]);
            if (!result.ok) {
              return {
                ok: false as const,
                errors: { name: ajustesErrorText(result.code) },
              };
            }
            setList((prev) =>
              prev.map((x) =>
                x.id === dialogTarget.staffId
                  ? {
                      ...x,
                      name: payload.name,
                      serviceIds: payload.serviceIds,
                      title: titleResult.ok ? form.title : x.title,
                    }
                  : x,
              ),
            );
            if (!titleResult.ok) {
              return {
                ok: false as const,
                errors: { title: ajustesErrorText(titleResult.code) },
              };
            }
            return { ok: true as const };
          }
          const result = await staffActions.create(payload);
          if (!result.ok) {
            return {
              ok: false as const,
              errors: { name: ajustesErrorText(result.code) },
            };
          }
          const titleResult = await staffActions.updateTitle(
            result.id,
            form.title,
          );
          setList((prev) => [
            ...prev,
            {
              id: result.id,
              name: payload.name,
              active: true,
              serviceIds: payload.serviceIds,
              title: titleResult.ok ? form.title : "",
            },
          ]);
          return { ok: true as const };
        }}
      />

      {photoStaff ? (
        <PhotoDialog
          key={photoStaff.id}
          staffId={photoStaff.id}
          staffName={photoStaff.name}
          url={photoUrls[photoStaff.id] ?? null}
          actions={staffActions}
          open={photoTarget != null}
          onOpenChange={(open) => {
            if (!open) setPhotoTarget(null);
          }}
          onChange={(url) =>
            setPhotoUrls((prev) => ({ ...prev, [photoStaff.id]: url }))
          }
        />
      ) : null}

      {permsStaff && permsAccount?.status === "active" && teamActions ? (
        <EditPermsDialog
          key={permsStaff.id}
          staffName={permsStaff.name}
          initial={permsAccount.perms}
          open={permsTarget != null}
          onOpenChange={(open) => {
            if (!open) setPermsTarget(null);
          }}
          onUpdatePerms={(perms) =>
            teamActions.onUpdatePerms(permsAccount.userId, perms)
          }
          onSaved={() => {
            setToast(equipo.miembros.toast.permisosGuardados);
            void refreshTeam();
          }}
        />
      ) : null}

      {inviteStaff && teamActions ? (
        <InviteDialog
          key={inviteStaff.id}
          staffId={inviteStaff.id}
          staffName={inviteStaff.name}
          open={inviteTarget != null}
          onOpenChange={(open) => {
            if (!open) setInviteTarget(null);
          }}
          onInvite={teamActions.onInvite}
          onInvited={() => void refreshTeam()}
        />
      ) : null}

      {removeStaff && teamActions ? (
        <ConfirmDialog
          open={removeTarget != null}
          onOpenChange={(open) => {
            if (!open) setRemoveTarget(null);
          }}
          title={
            accountOf(removeStaff.id).status === "pending"
              ? equipo.invitaciones.confirmarRevocar.titulo
              : equipo.miembros.confirmarQuitar.titulo
          }
          body={
            accountOf(removeStaff.id).status === "pending"
              ? equipo.invitaciones.confirmarRevocar.cuerpo
              : equipo.miembros.confirmarQuitar.cuerpo
          }
          confirmLabel={
            accountOf(removeStaff.id).status === "pending"
              ? equipo.invitaciones.confirmarRevocar.ctaSi
              : equipo.miembros.confirmarQuitar.ctaSi
          }
          cancelLabel={
            accountOf(removeStaff.id).status === "pending"
              ? equipo.invitaciones.confirmarRevocar.ctaNo
              : equipo.miembros.confirmarQuitar.ctaNo
          }
          onConfirm={async () => {
            const account = accountOf(removeStaff.id);
            if (account.status === "pending") {
              const result = await teamActions.onRevoke(account.invitationId);
              if (result.ok) {
                setToast(equipo.invitaciones.toast.revocada);
                void refreshTeam();
              }
            } else if (account.status === "active") {
              const result = await teamActions.onRemoveAccess(account.userId);
              if (result.ok) {
                setToast(equipo.miembros.toast.accesoQuitado);
                void refreshTeam();
              }
            }
            setRemoveTarget(null);
          }}
        />
      ) : null}
    </Card>
  );
}
