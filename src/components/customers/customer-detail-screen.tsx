"use client";

// CustomerDetailScreen — /app/clientes/[id] (WP-24, F9; WP-57 UX-ombyggnad).
// Samma skal som CustomersScreen. Export/anonimizar återanvänder samma
// server actions som agendans popover (`CustomerPrivacyActions`), men
// placeras här som egna menyposter under "⋯" i stället för den komponenten
// (WP-57: "alla åtgärder samlade" i en rad + en meny, inte ett eget kort per
// åtgärd). Svaren på bokningsfrågor återanvänder `CustomerAnswersCard`
// (redan byggd för den här skärmen, WP-40).
//
// WP-57 (UX-genomgången, "Kundkort" + fel 1–2): ett huvud med identitet,
// taggar, fyra nyckeltal och alla åtgärder, i stället för åtta separata kort
// med samma vikt. Datum formateras ALLTID via `src/lib/format/dates.ts`
// (fel 1: kundkortet visade tidigare `Date.toString()`, t.ex. "Thu Oct 01
// 2026 … GMT+0200" — roten var `src/server/owner/clientes.ts`, som nu
// konverterar med `.toISOString()` innan strängen lämnar servern).
// Samtyckesrutan har nu två tydligt etiketterade rader i stället för två
// meningar utan rubrik (fel 2).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AppShell } from "@/components/dashboard/app-shell";
import { MainNav } from "@/components/dashboard/main-nav";
import {
  type CustomerExportResult,
  type CustomerMutationResult,
} from "@/components/agenda/customer-privacy-actions";
import { CustomerAnswersCard } from "./customer-answers-card";
import { MessageDialog } from "./message-dialog";
import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";
import type {
  MyProfileActions,
  MyProfileData,
} from "@/components/shared/my-profile-dialog";
import { OwnerPageHeader } from "@/components/shared/owner-page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip, type ChipProps } from "@/components/ui/chip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconButton } from "@/components/ui/icon-button";
import { strokeArrow } from "@/components/ui/icons";
import { initialsOf } from "@/lib/format/initials";
import { Menu, MenuButtonItem, MenuLinkItem } from "@/components/ui/menu";
import { Textarea } from "@/components/ui/textarea";
import { appHref } from "@/config/routes";
import { ajustes, clientes, comun, estados, fichaAtencion, nav } from "@/i18n";
import {
  APP_TZ,
  formatDate,
  formatTimeRange,
  parseInstant,
} from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { formatPhone, isE164 } from "@/lib/format/phone";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
} from "lucide-react";

import { HABITUAL_VISITS_THRESHOLD } from "./types";
import type {
  CustomerBookingRow,
  CustomerDetail,
  NotifyMemberResult,
  SetMemberResult,
} from "./types";
import { uxTextos } from "@/i18n";

export type CustomerDetailScreenProps = {
  customer: CustomerDetail;
  /** WP-24 (D-034): döljer Caja i navigeringen. `undefined` visar den. */
  canViewReports?: boolean;
  /** WP-88 (D-074): länk till fichan, bara med `can_view_records`. */
  fichaHref?: string;
  onLogout?: () => void | Promise<void>;
  onUpdateNotes: (
    notes: string,
  ) => Promise<{ ok: true } | { ok: false; code: string }>;
  onExportCustomer?: (customerId: string) => Promise<CustomerExportResult>;
  onAnonymizeCustomer?: (customerId: string) => Promise<CustomerMutationResult>;
  /** WP-54: medlemskap, nu en menypost under "⋯" i stället för ett eget
   * kort. `undefined` (design lab, eller `!customer.canManageMembership`)
   * döljer menyposten helt. */
  onSetMember?: (isMember: boolean) => Promise<SetMemberResult>;
  /** WP-54: "Avisar al cliente" — köar `bienvenidaMiembro`. `undefined`
   * döljer menyposten. */
  onNotifyMember?: () => Promise<NotifyMemberResult>;
  /** WP-57 punkt 7: `<OwnerPageHeader>` (klocka + profilmeny), samma data
   * som Inicio skickar till `AppShell` (`owner-chrome.tsx`). */
  ownerName: string;
  publicPageHref: string;
  myProfile?: MyProfileData;
  myProfileActions?: MyProfileActions;
  /** WP-86 (D-072): kundens paket (`CustomerPackagesCard`), renderat av
   * sidan. `undefined` döljer kortet. */
  packagesCard?: ReactNode;
};

const STATUS_CHIP: Record<
  string,
  { label: string; tone: "success" | "pending" | "neutral" }
> = {
  requested: { label: estados.porConfirmar, tone: "pending" },
  pending_payment: { label: estados.sinConfirmar, tone: "pending" },
  confirmed: { label: estados.confirmada, tone: "success" },
  completed: { label: estados.llego, tone: "success" },
  no_show: { label: estados.noVino, tone: "neutral" },
  cancelled: { label: estados.cancelada, tone: "neutral" },
};

function dateLabel(iso: string): string {
  const parsed = parseInstant(iso);
  if (!parsed.ok) return iso;
  return formatDate(parsed.value, APP_TZ, "weekdayDayMonthShort");
}

function timeRangeLabel(startIso: string, endIso: string): string {
  const start = parseInstant(startIso);
  const end = parseInstant(endIso);
  if (!start.ok || !end.ok) return "";
  return formatTimeRange(start.value, end.value, APP_TZ);
}

function BookingRow({ booking }: { booking: CustomerBookingRow }) {
  const chip = STATUS_CHIP[booking.status];
  return (
    <li className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0 last:pb-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-14 font-bold text-ink">{booking.service}</span>
        <span className="text-13 text-muted">
          {dateLabel(booking.start)} ·{" "}
          {timeRangeLabel(booking.start, booking.end)} · {booking.staffName}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-13 font-semibold text-ink">
          {formatMoney(booking.priceClp)}
        </span>
        {chip ? (
          <Chip tone={chip.tone} size="sm">
            {chip.label}
          </Chip>
        ) : null}
      </div>
    </li>
  );
}

type Tag = { tone: ChipProps["tone"]; label: string };

/** Mismas tres etiquetas que `tagsOf` en `customers-screen.tsx` (duplicado
 * a propósito, mismo motivo que el resto de este archivo: un "use client"
 * nunca importa de otro componente solo para una función de 4 líneas). */
function tagsOf(customer: CustomerDetail): Tag[] {
  const tags: Tag[] = [];
  if (customer.isMember) tags.push({ tone: "lavender", label: estados.socio });
  if (customer.stats.visitsCount >= HABITUAL_VISITS_THRESHOLD) {
    tags.push({ tone: "peach", label: uxTextos.etiquetaHabitual });
  }
  if (customer.consentMarketing.at) {
    tags.push({ tone: "success", label: uxTextos.etiquetaAceptaOfertas });
  }
  return tags;
}

function ConsentRow({
  // TODO_COPY: no hay en es-CL.ts una palabra corta para "Términos" (consentTerms)
  // ni para "Ofertas y novedades" (consentMarketing) como ETIQUETA de fila — los
  // textos existentes (`clientes.consentimientos.*`) son oraciones completas,
  // no títulos. El valor del chip sí usa esas oraciones reales.
  label,
  consent,
}: {
  label: string;
  consent: CustomerDetail["consentTerms"];
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-14 font-semibold text-ink">{label}</span>
      <Chip tone={consent.at ? "success" : "neutral"} size="sm">
        {consent.at
          ? clientes.consentimientos.aceptoEl({
              fecha: dateLabel(consent.at),
              canal: consent.channel
                ? clientes.consentimientos.canalEnFrase[consent.channel]
                : "",
            })
          : clientes.consentimientos.sinRegistro}
      </Chip>
    </div>
  );
}

export function CustomerDetailScreen({
  customer,
  canViewReports,
  fichaHref,
  onLogout,
  onUpdateNotes,
  onExportCustomer,
  onAnonymizeCustomer,
  onSetMember,
  onNotifyMember,
  ownerName,
  publicPageHref,
  myProfile,
  myProfileActions,
  packagesCard,
}: CustomerDetailScreenProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [notesError, setNotesError] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const [isMember, setIsMember] = useState(customer.isMember);
  const [savingMember, setSavingMember] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState<
    "idle" | "sending" | "sent" | "already" | "error"
  >("idle");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [anonymizeOpen, setAnonymizeOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const phone =
    customer.phone && isE164(customer.phone) ? customer.phone : null;
  const hasAnswers =
    customer.answers.latest.length > 0 || customer.answers.history.length > 0;
  const hasUpcoming = customer.upcoming.length > 0;
  const hasHistory = customer.history.length > 0;

  async function handleToggleMember() {
    if (!onSetMember || savingMember) return;
    setSavingMember(true);
    setNotifyStatus("idle");
    const result = await onSetMember(!isMember);
    setSavingMember(false);
    if (result.ok) setIsMember(!isMember);
  }

  async function handleNotifyMember() {
    if (!onNotifyMember || notifyStatus === "sending") return;
    setNotifyStatus("sending");
    const result = await onNotifyMember();
    if (result.ok) {
      setNotifyStatus(result.queued ? "sent" : "already");
    } else {
      setNotifyStatus("error");
    }
  }

  async function handleSaveNotes() {
    if (savingNotes) return;
    if (notes.length > 1000) {
      setNotesError(clientes.notas.errorLargo);
      return;
    }
    setSavingNotes(true);
    setNotesError(null);
    setNotesSaved(false);
    const result = await onUpdateNotes(notes);
    setSavingNotes(false);
    if (result.ok) {
      setNotesSaved(true);
    } else if (result.code === "too_long") {
      setNotesError(clientes.notas.errorLargo);
    } else {
      setNotesError(comun.algoSalioMal);
    }
  }

  function downloadJson(filename: string, data: unknown) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleExport() {
    if (!onExportCustomer || exporting) return;
    setExporting(true);
    setActionError(null);
    try {
      const result = await onExportCustomer(customer.id);
      if (result.ok) {
        downloadJson(`cliente-${customer.id}.json`, result.data);
      } else {
        setActionError(clientes.privacidad.error);
      }
    } catch {
      setActionError(clientes.privacidad.error);
    } finally {
      setExporting(false);
    }
  }

  async function handleAnonymize() {
    if (!onAnonymizeCustomer) return;
    setActionError(null);
    const result = await onAnonymizeCustomer(customer.id);
    if (result.ok) {
      setAnonymizeOpen(false);
      router.push(appHref("appClientes"));
    } else {
      setActionError(clientes.privacidad.error);
    }
  }

  const statTiles: { value: string; label: string }[] = [
    {
      value: String(customer.stats.visitsCount),
      label: clientes.lista.columnaVisitas,
    },
    {
      value: String(customer.stats.noShowCount),
      label: clientes.lista.columnaInasistencias,
    },
    ...(customer.canViewMoney
      ? [
          {
            value: formatMoney(customer.stats.totalRevenueClp),
            label: clientes.ficha.totalGastado,
          },
        ]
      : []),
    {
      value: customer.stats.lastVisitAt
        ? dateLabel(customer.stats.lastVisitAt)
        : "—",
      label: clientes.lista.columnaUltimaVisita,
    },
  ];

  const hasMenu =
    (customer.isOwner && onExportCustomer) ||
    (customer.isOwner && onAnonymizeCustomer) ||
    (onSetMember && customer.canManageMembership) ||
    (isMember && customer.email && onNotifyMember);

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
              <Link href={appHref("appClientes")}>
                <ArrowLeft
                  aria-hidden="true"
                  className="size-4.5"
                  strokeWidth={strokeArrow}
                />
              </Link>
            </IconButton>
            {clientes.titulo}
          </span>
        }
      />

      <Card radius="tile" padding="lg" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar
            initials={initialsOf(customer.name)}
            tone="lilac-100"
            size={56}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-24 font-bold tracking-display text-ink">
                {customer.name}
              </h1>
              {tagsOf(customer).map((t) => (
                <Chip key={t.label} tone={t.tone} size="sm">
                  {t.label}
                </Chip>
              ))}
            </div>
            <p className="text-14 text-muted">
              {clientes.ficha.clienteDesde({
                fecha: dateLabel(customer.createdAt),
              })}
              {phone ? ` · ${formatPhone(phone)}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="primary" size="lg">
            <Link href={`${appHref("appAgenda")}?cliente=${customer.id}`}>
              {clientes.ficha.ctaNuevaReserva}
            </Link>
          </Button>
          {fichaHref ? (
            <Button asChild variant="secondary" size="lg">
              <Link href={fichaHref}>{fichaAtencion.ctaAbrir}</Link>
            </Button>
          ) : null}
          {phone ? (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setMessageDialogOpen(true)}
            >
              <MessageSquare
                aria-hidden="true"
                className="size-4"
                strokeWidth={strokeArrow}
              />
              {clientes.ficha.ctaWhatsapp}
            </Button>
          ) : null}
          {phone ? (
            <Button asChild variant="secondary" size="lg">
              <a href={`tel:${phone}`}>
                <Phone
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={strokeArrow}
                />
                {clientes.ficha.ctaLlamar}
              </a>
            </Button>
          ) : null}
          {customer.canManageMembership ? (
            customer.consentMarketing.at ? (
              <Button asChild variant="secondary" size="lg">
                <Link
                  href={`${appHref("appClientesUtskickNytt")}?kunder=${customer.id}`}
                >
                  {clientes.ficha.ctaEnviarOferta}
                </Link>
              </Button>
            ) : (
              <span className="flex items-center gap-2 text-13 text-muted">
                <Button type="button" variant="secondary" size="lg" disabled>
                  {clientes.ficha.ctaEnviarOferta}
                </Button>
                {clientes.ficha.ofertaSinConsentimiento}
              </span>
            )
          ) : null}
          {hasMenu ? (
            <Menu
              label={nav.masOpciones}
              trigger={
                <IconButton label={nav.masOpciones} tone="surface" size={44}>
                  <MoreHorizontal
                    aria-hidden="true"
                    className="size-4.5"
                    strokeWidth={strokeArrow}
                  />
                </IconButton>
              }
            >
              {customer.email ? (
                <MenuLinkItem
                  href={`mailto:${customer.email}`}
                  icon={
                    <Mail
                      aria-hidden="true"
                      className="size-4"
                      strokeWidth={strokeArrow}
                    />
                  }
                >
                  {clientes.ficha.ctaEmail}
                </MenuLinkItem>
              ) : null}
              {onSetMember && customer.canManageMembership ? (
                <MenuButtonItem
                  disabled={savingMember}
                  onClick={() => void handleToggleMember()}
                >
                  {/* TODO_COPY: no hay un verbo corto "Marcar/Quitar de socios"
                      en es-CL.ts, solo el sustantivo `estados.socio` ("Socio"). */}
                  {isMember ? uxTextos.quitarSocio : uxTextos.marcarSocio}
                </MenuButtonItem>
              ) : null}
              {isMember && customer.email && onNotifyMember ? (
                <MenuButtonItem
                  disabled={notifyStatus === "sending"}
                  onClick={() => void handleNotifyMember()}
                >
                  {clientes.ficha.notificarCta}
                </MenuButtonItem>
              ) : null}
              {customer.isOwner && onExportCustomer ? (
                <MenuButtonItem
                  disabled={exporting}
                  onClick={() => void handleExport()}
                >
                  {clientes.privacidad.ctaExportar}
                </MenuButtonItem>
              ) : null}
              {customer.isOwner && onAnonymizeCustomer ? (
                <MenuButtonItem onClick={() => setAnonymizeOpen(true)}>
                  {clientes.privacidad.ctaAnonimizar}
                </MenuButtonItem>
              ) : null}
            </Menu>
          ) : null}
        </div>

        {notifyStatus === "sent" || notifyStatus === "already" ? (
          <span role="status" className="text-13 text-muted">
            {notifyStatus === "sent"
              ? clientes.ficha.notificarEnviado
              : clientes.ficha.notificarYaEnviado}
          </span>
        ) : null}
        {notifyStatus === "error" || actionError ? (
          <span role="alert" className="text-13 text-ink">
            {actionError ?? comun.algoSalioMal}
          </span>
        ) : null}

        <div
          className={
            statTiles.length === 4
              ? "grid grid-cols-2 gap-4 border-t border-line-strong pt-4 sm:grid-cols-4"
              : "grid grid-cols-3 gap-4 border-t border-line-strong pt-4"
          }
        >
          {statTiles.map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <span className="font-display text-22 font-semibold tracking-display whitespace-nowrap">
                {s.value}
              </span>
              <span className="text-12 text-muted">{s.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {phone ? (
        <MessageDialog
          open={messageDialogOpen}
          onOpenChange={setMessageDialogOpen}
          customerName={customer.name}
          phone={phone}
        />
      ) : null}

      <ConfirmDialog
        open={anonymizeOpen}
        onOpenChange={setAnonymizeOpen}
        title={clientes.privacidad.confirmarTitulo}
        body={clientes.privacidad.confirmarCuerpo}
        confirmLabel={clientes.privacidad.confirmarSi}
        cancelLabel={clientes.privacidad.confirmarNo}
        onConfirm={handleAnonymize}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card radius="tile" padding="lg" className="flex flex-col gap-1">
          {/* TODO_COPY: no hay un título corto "Tidslinje"/"Timeline" en
              es-CL.ts — se reutilizan los dos títulos existentes como
              subtítulos de la misma lista en vez de inventar uno nuevo. */}
          <h3 className="text-13 font-bold tracking-caps text-muted uppercase">
            {clientes.ficha.proximasTitulo}
          </h3>
          {hasUpcoming ? (
            <ul className="mb-3">
              {customer.upcoming.map((b) => (
                <BookingRow key={b.id} booking={b} />
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-13 text-muted">
              {clientes.ficha.proximasVacio}
            </p>
          )}
          <h3 className="text-13 font-bold tracking-caps text-muted uppercase">
            {clientes.ficha.historialTitulo}
          </h3>
          {hasHistory ? (
            <ul>
              {customer.history.map((b) => (
                <BookingRow key={b.id} booking={b} />
              ))}
            </ul>
          ) : (
            <p className="text-13 text-muted">
              {clientes.ficha.historialVacio}
            </p>
          )}
        </Card>

        <Card radius="tile" padding="lg" className="flex flex-col gap-1">
          <h2 className="mb-1 text-15 font-bold text-ink">
            {clientes.ficha.consentimientosTitulo}
          </h2>
          <div className="flex flex-col divide-y divide-line">
            <ConsentRow
              label={uxTextos.consentTerminos}
              consent={customer.consentTerms}
            />
            <ConsentRow
              label={uxTextos.consentOfertas}
              consent={customer.consentMarketing}
            />
          </div>

          <div className="mt-3 flex flex-col gap-3 border-t border-line-strong pt-3">
            <Textarea
              label={clientes.notas.label}
              hint={clientes.notas.ayuda}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesSaved(false);
              }}
              maxLength={1000}
              disabled={!customer.canEditNotes}
              error={notesError ?? undefined}
            />
            {customer.canEditNotes ? (
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={savingNotes}
                  onClick={() => void handleSaveNotes()}
                >
                  {comun.guardar}
                </Button>
                {notesSaved ? (
                  <span role="status" className="text-13 text-muted">
                    {ajustes.cambiosGuardados}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </Card>

        {packagesCard ? (
          <div className="lg:col-span-2">{packagesCard}</div>
        ) : null}

        <section className="flex flex-col gap-3 lg:col-span-2">
          <h2 className="text-15 font-bold text-ink">
            {clientes.ficha.respuestasTitulo}
          </h2>
          {hasAnswers ? (
            <CustomerAnswersCard data={customer.answers} />
          ) : (
            <Card radius="tile" padding="lg">
              <p className="text-13 text-muted">
                {clientes.ficha.respuestasVacio}
              </p>
            </Card>
          )}
        </section>
      </div>
    </AppShell>
  );
}
