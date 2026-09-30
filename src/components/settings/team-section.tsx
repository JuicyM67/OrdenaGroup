"use client";

// Ajustes → Equipo: åtkomst till kontot (WP-46 steg 6, D-034). Bjud in en
// personalrad utan konto, hantera väntande inbjudningar (skicka igen/
// återkalla) och redigera/ta bort åtkomst för befintliga medlemmar. Bara
// ägaren ser den här sektionen (`AjustesScreen` renderar den bara när
// `data.member.role === "owner"`, samma villkor som servern kräver i
// `src/server/team/members.ts`) — renderas direkt under `StaffSection` i
// samma `id="equipo"`-yta (ingen egen "Equipo"-rubrik, StaffSections räcker).
import { useId, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconButton } from "@/components/ui/icon-button";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { ajustes, comun, equipo } from "@/i18n";
import { APP_TZ, formatLocalDate, toLocalDate } from "@/lib/format/dates";

import { ajustesErrorText } from "./error-text";
// Typerna speglar `src/server/team/members.ts`/`invitations.ts`, duplicerade
// i stället för importerade (samma regel som `./types.ts`s filkommentar: en
// "use client"-fil importerar aldrig något — inte ens bara typer — under
// `@/server/*`).
import type {
  TeamAccount,
  TeamData,
  TeamInviteResult,
  TeamStaffMember,
} from "./types";

export type TeamPerms = {
  can_manage_own_bookings: boolean;
  can_manage_all_bookings: boolean;
  can_cancel_bookings: boolean;
  can_edit_catalog: boolean;
  can_manage_team: boolean;
  can_view_reports: boolean;
  can_edit_settings: boolean;
};

type ActiveStaff = TeamStaffMember & {
  account: Extract<TeamAccount, { status: "active" }>;
};
type PendingStaff = TeamStaffMember & {
  account: Extract<TeamAccount, { status: "pending" }>;
};

/** Samma ordning som planens steg 1 och `equipo.permisos` (es-CL.ts). */
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
];

const DEFAULT_PERMS: TeamPerms = {
  can_manage_own_bookings: true,
  can_manage_all_bookings: false,
  can_cancel_bookings: false,
  can_edit_catalog: false,
  can_manage_team: false,
  can_view_reports: false,
  can_edit_settings: false,
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
// Bjud in till kontot
// ---------------------------------------------------------------------------

function InviteDialog({
  open,
  onOpenChange,
  invitable,
  onInvite,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invitable: readonly TeamStaffMember[];
  onInvite: TeamActions["onInvite"];
  onInvited: () => void;
}) {
  const descriptionId = useId();
  const [email, setEmail] = useState("");
  const [staffId, setStaffId] = useState(invitable[0]?.staffId ?? "");
  const [flags, setFlags] = useState<TeamPerms>(DEFAULT_PERMS);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    staffId?: string;
    general?: string;
  }>({});

  function reset() {
    setEmail("");
    setStaffId(invitable[0]?.staffId ?? "");
    setFlags(DEFAULT_PERMS);
    setErrors({});
  }

  async function submit() {
    const nextErrors: typeof errors = {};
    if (email.trim() === "") {
      nextErrors.email = equipo.invitarDialog.errores.emailInvalido;
    }
    if (staffId === "") {
      nextErrors.staffId = equipo.invitarDialog.errores.profesionalRequerido;
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
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
      } else if (
        result.code === "staff_not_found" ||
        result.code === "invitation_pending"
      ) {
        setErrors({ staffId: ajustesErrorText(result.code) });
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

            <TextField
              label={equipo.invitarDialog.emailLabel}
              placeholder={equipo.invitarDialog.emailPlaceholder}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              maxLength={254}
            />

            <Select
              label={equipo.invitarDialog.profesionalLabel}
              hint={
                errors.staffId
                  ? undefined
                  : equipo.invitarDialog.profesionalAyuda
              }
              error={errors.staffId}
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
            >
              {invitable.length === 0 ? <option value="" /> : null}
              {invitable.map((s) => (
                <option key={s.staffId} value={s.staffId}>
                  {s.name}
                </option>
              ))}
            </Select>

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
                disabled={saving || invitable.length === 0}
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
// Väntande inbjudningar
// ---------------------------------------------------------------------------

function PendingInvitations({
  staff,
  onResend,
  onRevoke,
  onChanged,
}: {
  staff: readonly PendingStaff[];
  onResend: TeamActions["onResend"];
  onRevoke: TeamActions["onRevoke"];
  onChanged: () => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (staff.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-15 font-bold text-ink">
        {equipo.invitaciones.titulo}
      </h3>
      {toast ? (
        <p role="status" className="text-13 text-ink">
          {toast}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        {staff.map((s) => (
          <div
            key={s.staffId}
            className="flex flex-col gap-2 rounded-tile bg-canvas p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-14 font-bold text-ink">{s.name}</p>
              <p className="text-13 text-muted">{s.account.email}</p>
              <p className="text-13 text-muted">
                {equipo.invitaciones.enviada({
                  fecha: formatLocalDate(
                    toLocalDate(new Date(s.account.sentAt), APP_TZ),
                    "weekdayDayMonthShort",
                  ),
                })}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pendingId === s.account.invitationId}
                onClick={() => {
                  const invitationId = s.account.invitationId;
                  setPendingId(invitationId);
                  void onResend(invitationId)
                    .then((r) => {
                      if (r.ok) {
                        setToast(equipo.invitaciones.toast.reenviada);
                        onChanged();
                      }
                    })
                    .finally(() => setPendingId(null));
                }}
              >
                {equipo.invitaciones.ctaReenviar}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setRevokeTarget(s.account.invitationId)}
              >
                {equipo.invitaciones.ctaRevocar}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={revokeTarget != null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title={equipo.invitaciones.confirmarRevocar.titulo}
        body={equipo.invitaciones.confirmarRevocar.cuerpo}
        confirmLabel={equipo.invitaciones.confirmarRevocar.ctaSi}
        cancelLabel={equipo.invitaciones.confirmarRevocar.ctaNo}
        onConfirm={async () => {
          if (!revokeTarget) return;
          const result = await onRevoke(revokeTarget);
          if (result.ok) {
            setToast(equipo.invitaciones.toast.revocada);
            onChanged();
          }
          setRevokeTarget(null);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Miembros (cuentas activas)
// ---------------------------------------------------------------------------

function EditPermsForm({
  initial,
  saving,
  error,
  onCancel,
  onSubmit,
}: {
  initial: TeamPerms;
  saving: boolean;
  error?: string;
  onCancel: () => void;
  onSubmit: (next: TeamPerms) => void;
}) {
  const [flags, setFlags] = useState<TeamPerms>(initial);
  return (
    <>
      <PermSwitches value={flags} onChange={setFlags} disabled={saving} />
      {error ? (
        <p role="alert" className="text-13 text-ink">
          {error}
        </p>
      ) : null}
      <div className="mt-1 flex justify-end gap-3">
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          {ajustes.seguirEditando}
        </Button>
        <Button
          type="button"
          variant="primary"
          size="lg"
          disabled={saving}
          onClick={() => onSubmit(flags)}
        >
          {saving ? ajustes.guardando : ajustes.guardarCambios}
        </Button>
      </div>
    </>
  );
}

function EditPermsDialog({
  member,
  onOpenChange,
  onUpdatePerms,
  onSaved,
}: {
  member: ActiveStaff | null;
  onOpenChange: (open: boolean) => void;
  onUpdatePerms: TeamActions["onUpdatePerms"];
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  return (
    <Dialog.Root
      open={member != null}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 flex items-center justify-center overflow-y-auto bg-ink/45 p-4">
          <Dialog.Content className="flex w-full max-w-md flex-col gap-4 rounded-panel bg-surface p-6 shadow-popover">
            <div className="flex items-start justify-between">
              <Dialog.Title className="text-17 font-bold text-ink">
                {member?.name ?? ""}
              </Dialog.Title>
              <Dialog.Close asChild>
                <IconButton label={comun.cerrar} tone="ghost" size={30}>
                  <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
                </IconButton>
              </Dialog.Close>
            </div>
            {member ? (
              <EditPermsForm
                key={member.staffId}
                initial={member.account.perms}
                saving={saving}
                error={error}
                onCancel={() => onOpenChange(false)}
                onSubmit={async (next) => {
                  setSaving(true);
                  setError(undefined);
                  try {
                    const result = await onUpdatePerms(
                      member.account.userId,
                      next,
                    );
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
              />
            ) : null}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Members({
  staff,
  onUpdatePerms,
  onRemoveAccess,
  onChanged,
}: {
  staff: readonly ActiveStaff[];
  onUpdatePerms: TeamActions["onUpdatePerms"];
  onRemoveAccess: TeamActions["onRemoveAccess"];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<ActiveStaff | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (staff.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-15 font-bold text-ink">{equipo.miembros.titulo}</h3>
      {toast ? (
        <p role="status" className="text-13 text-ink">
          {toast}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        {staff.map((s) => (
          <div
            key={s.staffId}
            className="flex flex-col gap-2 rounded-tile bg-canvas p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-14 font-bold text-ink">{s.name}</p>
              <p className="text-13 text-muted">{equipo.miembros.rol.staff}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setEditing(s)}
              >
                {equipo.miembros.ctaEditarPermisos}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setRemoveTarget(s.account.userId)}
              >
                {equipo.miembros.ctaQuitarAcceso}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <EditPermsDialog
        member={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onUpdatePerms={onUpdatePerms}
        onSaved={() => {
          setToast(equipo.miembros.toast.permisosGuardados);
          onChanged();
        }}
      />

      <ConfirmDialog
        open={removeTarget != null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title={equipo.miembros.confirmarQuitar.titulo}
        body={equipo.miembros.confirmarQuitar.cuerpo}
        confirmLabel={equipo.miembros.confirmarQuitar.ctaSi}
        cancelLabel={equipo.miembros.confirmarQuitar.ctaNo}
        onConfirm={async () => {
          if (!removeTarget) return;
          const result = await onRemoveAccess(removeTarget);
          if (result.ok) {
            setToast(equipo.miembros.toast.accesoQuitado);
            onChanged();
          }
          setRemoveTarget(null);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sección completa
// ---------------------------------------------------------------------------

export type TeamSectionProps = {
  data: TeamData;
  actions: TeamActions;
  /** Refresca la lista tras una mutación (server action + reload, mismo
   * patrón que `reloadAjustesData` en `./actions.ts`). */
  onReload: () => Promise<TeamData | null>;
};

export function TeamSection({
  data: initialData,
  actions,
  onReload,
}: TeamSectionProps) {
  const [data, setData] = useState(initialData);
  const [inviteOpen, setInviteOpen] = useState(false);

  async function refresh() {
    const next = await onReload();
    if (next) setData(next);
  }

  const invitable = data.staff.filter(
    (s) => s.active && s.account.status === "none",
  );
  const pending = data.staff.filter(
    (s): s is PendingStaff => s.account.status === "pending",
  );
  const active = data.staff.filter(
    (s): s is ActiveStaff => s.account.status === "active",
  );
  const isEmpty = pending.length === 0 && active.length === 0;

  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-4">
      {!data.planLimitReached && invitable.length > 0 ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setInviteOpen(true)}
          >
            {equipo.ctaInvitar}
          </Button>
        </div>
      ) : null}

      {data.planLimitReached ? (
        <div className="flex flex-col gap-1 rounded-tile bg-canvas p-4">
          <p className="text-14 font-bold text-ink">
            {equipo.limiteDelPlan.titulo}
          </p>
          <p className="text-13 text-muted">{equipo.limiteDelPlan.texto}</p>
        </div>
      ) : null}

      {isEmpty ? <p className="text-13 text-muted">{equipo.vacio}</p> : null}

      <PendingInvitations
        staff={pending}
        onResend={actions.onResend}
        onRevoke={actions.onRevoke}
        onChanged={() => void refresh()}
      />

      <Members
        staff={active}
        onUpdatePerms={actions.onUpdatePerms}
        onRemoveAccess={actions.onRemoveAccess}
        onChanged={() => void refresh()}
      />

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        invitable={invitable}
        onInvite={actions.onInvite}
        onInvited={() => void refresh()}
      />
    </Card>
  );
}
