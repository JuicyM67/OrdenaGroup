"use client";

// WP-88 (D-074): fichan — en egen sida under kundkortet
// (`/app/clientes/[id]/ficha`), så att kundkortet bara får en länk. Enkel ficha,
// ingen journal: fasta fält som ägaren aktiverat, daterade anteckningar
// (ev. kopplade till en bokning) och vilka consentimientos kunden godkänt.
// Visas bara för ägaren och personal med `can_view_records` (sidan och
// servern kontrollerar, RLS också).
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AppShell } from "@/components/dashboard/app-shell";
import { MainNav } from "@/components/dashboard/main-nav";
import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";
import type {
  MyProfileActions,
  MyProfileData,
} from "@/components/shared/my-profile-dialog";
import { OwnerPageHeader } from "@/components/shared/owner-page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconButton } from "@/components/ui/icon-button";
import { strokeArrow } from "@/components/ui/icons";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { appHref } from "@/config/routes";
import { comun, fichaAtencion } from "@/i18n";
import {
  APP_TZ,
  formatDate,
  formatTime,
  parseInstant,
} from "@/lib/format/dates";

import type {
  FichaActions,
  FichaBookingOption,
  FichaConsent,
  FichaData,
  FichaMutationResult,
  RecordFieldKey,
} from "./types";

function dateLabel(iso: string): string {
  const p = parseInstant(iso);
  if (!p.ok) return "";
  return `${formatDate(p.value, APP_TZ, "weekdayDayMonthShort")} · ${formatTime(p.value, APP_TZ)}`;
}

function bookingLabel(b: FichaBookingOption): string {
  return `${b.serviceName} · ${dateLabel(b.start)}`;
}

function errorText(r: FichaMutationResult): string | null {
  return r.ok ? null : fichaAtencion.errores[r.code];
}

export type FichaScreenProps = {
  data: FichaData;
  actions: FichaActions;
  /** Uppgraderingsrutan (servern renderar `UpgradeNotice`) när planen saknar `records`. */
  planNotice?: ReactNode;
  canViewReports?: boolean;
  onLogout?: () => void | Promise<void>;
  ownerName: string;
  publicPageHref: string;
  myProfile?: MyProfileData;
  myProfileActions?: MyProfileActions;
};

export function FichaScreen({
  data,
  actions,
  planNotice,
  canViewReports,
  onLogout,
  ownerName,
  publicPageHref,
  myProfile,
  myProfileActions,
}: FichaScreenProps) {
  return (
    <AppShell
      rail={
        <MainNav
          active="clientes"
          onLogout={onLogout}
          canViewReports={canViewReports}
        />
      }
      mobileTabBar={
        <OwnerMobileTabBar
          active="clientes"
          className="lg:hidden"
          canViewReports={canViewReports}
        />
      }
      onLogout={onLogout}
      ownerName={ownerName}
      publicPageHref={publicPageHref}
      canViewReports={canViewReports}
      myProfile={myProfile}
      myProfileActions={myProfileActions}
      hideMobileTopBar
    >
      <OwnerPageHeader
        title={
          <span className="flex items-center gap-3">
            <IconButton label={comun.volver} tone="ghost" size={36} asChild>
              <Link href={appHref("appClienteDetail", data.customer.id)}>
                <ArrowLeft
                  aria-hidden="true"
                  className="size-4.5"
                  strokeWidth={strokeArrow}
                />
              </Link>
            </IconButton>
            {fichaAtencion.titulo}
          </span>
        }
      />

      <div className="flex flex-col gap-1">
        <h1 className="font-display text-24 font-bold tracking-display text-ink">
          {data.customer.name}
        </h1>
        <p className="flex items-start gap-2 text-13 text-muted">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
            strokeWidth={strokeArrow}
          />
          {fichaAtencion.aviso}
        </p>
      </div>

      {!data.canWrite && planNotice ? planNotice : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FieldsCard data={data} actions={actions} />
        <ConsentsCard data={data} actions={actions} />
        <EntriesCard data={data} actions={actions} />
      </div>
    </AppShell>
  );
}

function FieldsCard({
  data,
  actions,
}: {
  data: FichaData;
  actions: FichaActions;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<RecordFieldKey, string>>(
    data.values,
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    const payload: Partial<Record<RecordFieldKey, string>> = {};
    for (const k of data.fields) payload[k] = values[k];
    const r = await actions.saveFields(payload);
    setBusy(false);
    setStatus(r.ok ? fichaAtencion.campos.guardado : errorText(r));
    if (r.ok) router.refresh();
  }

  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-4">
      <h2 className="text-15 font-bold text-ink">
        {fichaAtencion.campos.titulo}
      </h2>
      {data.fields.length === 0 ? (
        <p className="text-13 text-muted">{fichaAtencion.campos.sinCampos}</p>
      ) : (
        <>
          {data.fields.map((k) => (
            <Textarea
              key={k}
              label={fichaAtencion.campos[k]}
              placeholder={fichaAtencion.campos.placeholder}
              maxLength={1000}
              rows={2}
              value={values[k]}
              disabled={!data.canWrite}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, [k]: e.target.value }));
              }}
            />
          ))}
          <div className="flex flex-wrap items-center gap-3">
            {data.canWrite ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => void save()}
              >
                {fichaAtencion.campos.ctaGuardar}
              </Button>
            ) : null}
            {status ? (
              <span role="status" className="text-13 text-muted">
                {status}
              </span>
            ) : data.valuesUpdatedAt ? (
              <span className="text-13 text-muted">
                {fichaAtencion.campos.actualizado({
                  fecha: dateLabel(data.valuesUpdatedAt),
                })}
              </span>
            ) : null}
          </div>
        </>
      )}
    </Card>
  );
}

function ConsentRow({
  consent,
  canWrite,
  onSign,
}: {
  consent: FichaConsent;
  canWrite: boolean;
  onSign: () => void;
}) {
  const a = consent.accepted;
  return (
    <li className="flex flex-col gap-1.5 border-b border-line py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-14 font-semibold text-ink">{consent.title}</span>
        {!consent.active ? (
          <Chip tone="neutral" size="sm">
            {fichaAtencion.consentimientos.archivado}
          </Chip>
        ) : null}
        {a ? (
          <Chip tone={a.isCurrent ? "success" : "pending"} size="sm">
            {fichaAtencion.consentimientos.aceptado({ fecha: dateLabel(a.at) })}
          </Chip>
        ) : (
          <Chip tone="pending" size="sm">
            {fichaAtencion.consentimientos.pendiente}
          </Chip>
        )}
      </div>
      {a ? (
        <p className="text-13 text-muted">
          {fichaAtencion.consentimientos.origen[a.source]} ·{" "}
          {fichaAtencion.consentimientos.version({ version: a.version })}
        </p>
      ) : null}
      {a && !a.isCurrent ? (
        <p className="text-13 text-muted">
          {fichaAtencion.consentimientos.versionAnterior}
        </p>
      ) : null}
      {canWrite && consent.active && !a?.isCurrent ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={onSign}
        >
          {fichaAtencion.consentimientos.ctaFirmarLocal}
        </Button>
      ) : null}
    </li>
  );
}

function ConsentsCard({
  data,
  actions,
}: {
  data: FichaData;
  actions: FichaActions;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sign(templateId: string) {
    setError(null);
    setCopied(false);
    const r = await actions.createSigningLink({
      templateId,
      bookingId: null,
    });
    if (r.ok) setLink(`${window.location.origin}${r.path}`);
    else setError(fichaAtencion.errores[r.code]);
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-3">
      <h2 className="text-15 font-bold text-ink">
        {fichaAtencion.consentimientos.titulo}
      </h2>
      {data.consents.length === 0 ? (
        <p className="text-13 text-muted">
          {fichaAtencion.consentimientos.vacio}
        </p>
      ) : (
        <ul className="flex flex-col">
          {data.consents.map((c) => (
            <ConsentRow
              key={c.templateId}
              consent={c}
              canWrite={data.canWrite}
              onSign={() => void sign(c.templateId)}
            />
          ))}
        </ul>
      )}
      {link ? (
        <div className="flex flex-col gap-2 rounded-tile bg-canvas p-4">
          <p className="text-14 font-semibold text-ink">
            {fichaAtencion.consentimientos.linkTitulo}
          </p>
          <p className="text-13 text-muted">
            {fichaAtencion.consentimientos.linkAyuda}
          </p>
          <p className="text-13 break-all text-ink">{link}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void copy()}
            >
              {copied
                ? fichaAtencion.consentimientos.copiado
                : fichaAtencion.consentimientos.ctaCopiar}
            </Button>
            <Button asChild variant="primary" size="sm">
              <a href={link} target="_blank" rel="noopener noreferrer">
                {fichaAtencion.consentimientos.ctaAbrirAqui}
              </a>
            </Button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-13 text-ink">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

function EntriesCard({
  data,
  actions,
}: {
  data: FichaData;
  actions: FichaActions;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function add() {
    if (busy) return;
    const trimmed = body.trim();
    if (!trimmed) {
      setError(fichaAtencion.notas.vacia);
      return;
    }
    if (trimmed.length > 4000) {
      setError(fichaAtencion.notas.demasiadoLarga);
      return;
    }
    setBusy(true);
    setError(null);
    const r = await actions.addEntry({
      body: trimmed,
      bookingId: bookingId || null,
    });
    setBusy(false);
    if (r.ok) {
      setBody("");
      setBookingId("");
      router.refresh();
    } else {
      setError(errorText(r));
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const r = await actions.deleteEntry(deleteId);
    setDeleteId(null);
    if (r.ok) router.refresh();
    else setError(errorText(r));
  }

  return (
    <Card
      radius="tile"
      padding="lg"
      className="flex flex-col gap-4 lg:col-span-2"
    >
      <h2 className="text-15 font-bold text-ink">
        {fichaAtencion.notas.titulo}
      </h2>

      {data.canWrite ? (
        <div className="flex flex-col gap-3">
          <Textarea
            label={fichaAtencion.notas.nueva}
            placeholder={fichaAtencion.notas.placeholder}
            maxLength={4000}
            rows={4}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
            }}
          />
          {data.bookings.length > 0 ? (
            <Select
              label={fichaAtencion.notas.reserva}
              value={bookingId}
              onChange={(e) => {
                setBookingId(e.target.value);
              }}
            >
              <option value="">{fichaAtencion.notas.sinReserva}</option>
              {data.bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {bookingLabel(b)}
                </option>
              ))}
            </Select>
          ) : null}
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="self-start"
            disabled={busy}
            onClick={() => void add()}
          >
            {fichaAtencion.notas.ctaAgregar}
          </Button>
          {error ? (
            <p role="alert" className="text-13 text-ink">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      {data.entries.length === 0 ? (
        <p className="text-13 text-muted">{fichaAtencion.notas.vacio}</p>
      ) : (
        <ul className="flex flex-col">
          {data.entries.map((e) => (
            <li
              key={e.id}
              className="flex flex-col gap-1.5 border-t border-line py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-13 font-semibold text-ink">
                  {dateLabel(e.createdAt)}
                </span>
                <span className="text-13 text-muted">
                  {fichaAtencion.notas.porAutor({
                    autor: e.authorName ?? fichaAtencion.notas.autorDesconocido,
                  })}
                </span>
              </div>
              {e.booking ? (
                <Chip tone="neutral" size="sm">
                  {bookingLabel(e.booking)}
                </Chip>
              ) : null}
              <p className="text-14 leading-body whitespace-pre-line text-ink">
                {e.body}
              </p>
              {e.canDelete ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  className="self-start"
                  onClick={() => {
                    setDeleteId(e.id);
                  }}
                >
                  {fichaAtencion.notas.ctaEliminar}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title={fichaAtencion.notas.eliminarTitulo}
        body={fichaAtencion.notas.eliminarCuerpo}
        confirmLabel={fichaAtencion.notas.eliminarSi}
        cancelLabel={fichaAtencion.notas.eliminarNo}
        onConfirm={confirmDelete}
      />
    </Card>
  );
}
