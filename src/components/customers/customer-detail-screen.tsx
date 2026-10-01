"use client";

// CustomerDetailScreen — /app/clientes/[id] (WP-24, F9): kundkortet. Samma
// skal som CustomersScreen. Export/anonimizar återanvänder
// `CustomerPrivacyActions` (agendans popover, WP-26) — samma server actions,
// bara en annan plats i UI:t. Svaren på bokningsfrågor återanvänder
// `CustomerAnswersCard` (redan byggd för den här skärmen, WP-40).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppShell } from "@/components/dashboard/app-shell";
import { MainNav } from "@/components/dashboard/main-nav";
import {
  CustomerPrivacyActions,
  type CustomerExportResult,
  type CustomerMutationResult,
} from "@/components/agenda/customer-privacy-actions";
import { CustomerAnswersCard } from "./customer-answers-card";
import { MessageDialog } from "./message-dialog";
import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { IconButton } from "@/components/ui/icon-button";
import { strokeArrow } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { marketConfig } from "@/config/market";
import { ajustes, clientes, comun, estados } from "@/i18n";
import {
  APP_TZ,
  formatDate,
  formatTimeRange,
  parseInstant,
} from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { formatPhone, isE164 } from "@/lib/format/phone";
import { ArrowLeft, Mail, MessageSquare, Phone } from "lucide-react";

import type {
  CustomerBookingRow,
  CustomerDetail,
  NotifyMemberResult,
  SendMessageResult,
  SetMemberResult,
} from "./types";

export type CustomerDetailScreenProps = {
  customer: CustomerDetail;
  /** WP-24 (D-034): döljer Caja i navigeringen. `undefined` visar den. */
  canViewReports?: boolean;
  onLogout?: () => void | Promise<void>;
  onUpdateNotes: (
    notes: string,
  ) => Promise<{ ok: true } | { ok: false; code: string }>;
  onExportCustomer?: (customerId: string) => Promise<CustomerExportResult>;
  onAnonymizeCustomer?: (customerId: string) => Promise<CustomerMutationResult>;
  /** WP-54: kryssrutan "Socio". `undefined` (design lab, eller
   * `!customer.canManageMembership`) döljer kortet helt. */
  onSetMember?: (isMember: boolean) => Promise<SetMemberResult>;
  /** WP-54: "Avisar al cliente" — köar `bienvenidaMiembro`. `undefined`
   * döljer knappen. */
  onNotifyMember?: () => Promise<NotifyMemberResult>;
  /** WP-55: "Enviar mensaje" (`MessageDialog`). Bara SE (`sendCustomerMessage`,
   * SMS via ClickSend) — `undefined` i CL, vars dialog öppnar `wa.me` utan
   * servern (se `message-dialog.tsx`). */
  onSendMessage?: (text: string) => Promise<SendMessageResult>;
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

export function CustomerDetailScreen({
  customer,
  canViewReports,
  onLogout,
  onUpdateNotes,
  onExportCustomer,
  onAnonymizeCustomer,
  onSetMember,
  onNotifyMember,
  onSendMessage,
}: CustomerDetailScreenProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [notesError, setNotesError] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const [isMember, setIsMember] = useState(customer.isMember);
  const [memberSince, setMemberSince] = useState(customer.memberSince);
  const [savingMember, setSavingMember] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState<
    "idle" | "sending" | "sent" | "already" | "error"
  >("idle");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  const phone =
    customer.phone && isE164(customer.phone) ? customer.phone : null;
  const isCl = marketConfig.phoneCountry === "CL";
  const hasAnswers =
    customer.answers.latest.length > 0 || customer.answers.history.length > 0;

  async function handleToggleMember(next: boolean) {
    if (!onSetMember || savingMember) return;
    setSavingMember(true);
    setNotifyStatus("idle");
    const result = await onSetMember(next);
    setSavingMember(false);
    if (result.ok) {
      setIsMember(next);
      setMemberSince(next ? new Date().toISOString() : null);
    }
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
    >
      <PageHeader
        variant="desktop"
        title={
          <span className="flex items-center gap-3">
            <IconButton label={comun.volver} tone="ghost" size={36} asChild>
              <Link href="/app/clientes">
                <ArrowLeft
                  aria-hidden="true"
                  className="size-4.5"
                  strokeWidth={strokeArrow}
                />
              </Link>
            </IconButton>
            {customer.name}
            {isMember ? (
              <Chip tone="lavender" size="sm">
                {estados.socio}
              </Chip>
            ) : null}
          </span>
        }
        meta={clientes.ficha.clienteDesde({
          fecha: dateLabel(customer.createdAt),
        })}
        actions={
          <Button asChild variant="primary" size="lg">
            <Link href={`/app/agenda?cliente=${customer.id}`}>
              {clientes.ficha.ctaNuevaReserva}
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {phone ? (
          <>
            <Button asChild variant="secondary" size="sm">
              <a href={`tel:${phone}`}>
                <Phone
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={strokeArrow}
                />
                {clientes.ficha.ctaLlamar}
              </a>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setMessageDialogOpen(true)}
            >
              <MessageSquare
                aria-hidden="true"
                className="size-4"
                strokeWidth={strokeArrow}
              />
              {isCl ? clientes.ficha.ctaWhatsapp : clientes.ficha.ctaSms}
            </Button>
          </>
        ) : null}
        {customer.email ? (
          <Button asChild variant="secondary" size="sm">
            <a href={`mailto:${customer.email}`}>
              <Mail
                aria-hidden="true"
                className="size-4"
                strokeWidth={strokeArrow}
              />
              {clientes.ficha.ctaEmail}
            </a>
          </Button>
        ) : null}
        {/* WP-31: "Enviar oferta" — misma spärr som membresía arriba (ägare
            eller can_manage_all_bookings, `canManageMembership`). Kräver
            dessutom att kunden faktiskt gett marknadsföringssamtycke —
            annars disabled med förklaring bredvid. */}
        {customer.canManageMembership ? (
          customer.consentMarketing.at ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/app/clientes/utskick/nytt?kunder=${customer.id}`}>
                {clientes.ficha.ctaEnviarOferta}
              </Link>
            </Button>
          ) : (
            <span className="flex items-center gap-2 text-13 text-muted">
              <Button type="button" variant="secondary" size="sm" disabled>
                {clientes.ficha.ctaEnviarOferta}
              </Button>
              {clientes.ficha.ofertaSinConsentimiento}
            </span>
          )
        ) : null}
      </div>

      {phone ? (
        <MessageDialog
          open={messageDialogOpen}
          onOpenChange={setMessageDialogOpen}
          customerName={customer.name}
          phone={phone}
          channel={isCl ? "whatsapp" : "sms"}
          onSend={onSendMessage}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card radius="tile" padding="lg" className="flex flex-col gap-3">
          <h2 className="text-15 font-bold text-ink">
            {clientes.ficha.contactoTitulo}
          </h2>
          <div className="flex flex-col gap-1 text-14">
            <div className="flex justify-between gap-3">
              <span className="text-muted">{clientes.editar.phoneLabel}</span>
              <span className="font-semibold text-ink">
                {phone ? formatPhone(phone) : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">{clientes.editar.emailLabel}</span>
              <span className="font-semibold text-ink">
                {customer.email ?? "—"}
              </span>
            </div>
          </div>
        </Card>

        <Card radius="tile" padding="lg" className="flex flex-col gap-3">
          <h2 className="text-15 font-bold text-ink">
            {clientes.ficha.consentimientosTitulo}
          </h2>
          <div className="flex flex-col gap-1.5 text-13">
            {customer.consentTerms.at ? (
              <span className="text-ink">
                {clientes.consentimientos.aceptoEl({
                  fecha: dateLabel(customer.consentTerms.at),
                  canal: customer.consentTerms.channel
                    ? clientes.consentimientos.canalEnFrase[
                        customer.consentTerms.channel
                      ]
                    : "",
                })}
              </span>
            ) : (
              <span className="text-muted">
                {clientes.consentimientos.sinRegistro}
              </span>
            )}
            {customer.consentMarketing.at ? (
              <span className="text-ink">
                {clientes.consentimientos.aceptoEl({
                  fecha: dateLabel(customer.consentMarketing.at),
                  canal: customer.consentMarketing.channel
                    ? clientes.consentimientos.canalEnFrase[
                        customer.consentMarketing.channel
                      ]
                    : "",
                })}
              </span>
            ) : (
              <span className="text-muted">
                {clientes.consentimientos.sinRegistro}
              </span>
            )}
          </div>
        </Card>

        {onSetMember && customer.canManageMembership ? (
          <Card
            radius="tile"
            padding="lg"
            className="flex flex-col gap-3 lg:col-span-2"
          >
            <h2 className="text-15 font-bold text-ink">
              {clientes.ficha.membresiaTitulo}
            </h2>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-14 font-semibold text-ink">
                  {estados.socio}
                </p>
                <p className="mt-0.5 text-12 text-muted">
                  {isMember && memberSince
                    ? clientes.ficha.socioDesde({
                        fecha: dateLabel(memberSince),
                      })
                    : clientes.ficha.socioAyuda}
                </p>
              </div>
              <Switch
                checked={isMember}
                onChange={(next) => void handleToggleMember(next)}
                label={estados.socio}
                disabled={savingMember}
              />
            </div>
            {isMember && customer.email && onNotifyMember ? (
              <div className="flex items-center gap-3 border-t border-line-strong pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={notifyStatus === "sending"}
                  onClick={() => void handleNotifyMember()}
                >
                  {clientes.ficha.notificarCta}
                </Button>
                {notifyStatus === "sent" ? (
                  <span role="status" className="text-13 text-muted">
                    {clientes.ficha.notificarEnviado}
                  </span>
                ) : null}
                {notifyStatus === "already" ? (
                  <span role="status" className="text-13 text-muted">
                    {clientes.ficha.notificarYaEnviado}
                  </span>
                ) : null}
                {notifyStatus === "error" ? (
                  <span role="alert" className="text-13 text-ink">
                    {comun.algoSalioMal}
                  </span>
                ) : null}
              </div>
            ) : null}
          </Card>
        ) : null}

        {customer.stats ? (
          <Card
            radius="tile"
            padding="lg"
            className="flex flex-col gap-3 lg:col-span-2"
          >
            <h2 className="text-15 font-bold text-ink">
              {clientes.ficha.estadisticasTitulo}
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="flex flex-col gap-0.5">
                <span className="font-display text-24 font-semibold tracking-display">
                  {customer.stats.visitsCount}
                </span>
                <span className="text-12 text-muted">
                  {clientes.lista.columnaVisitas}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-display text-24 font-semibold tracking-display">
                  {customer.stats.noShowCount}
                </span>
                <span className="text-12 text-muted">
                  {clientes.lista.columnaInasistencias}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-display text-24 font-semibold tracking-display">
                  {formatMoney(customer.stats.totalRevenueClp)}
                </span>
                <span className="text-12 text-muted">
                  {clientes.ficha.totalGastado}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-display text-24 font-semibold tracking-display">
                  {customer.stats.averagePriceClp == null
                    ? "—"
                    : formatMoney(customer.stats.averagePriceClp)}
                </span>
                <span className="text-12 text-muted">
                  {clientes.ficha.promedioPorVisita}
                </span>
              </div>
            </div>
          </Card>
        ) : null}

        <Card radius="tile" padding="lg" className="flex flex-col gap-1">
          <h2 className="mb-2 text-15 font-bold text-ink">
            {clientes.ficha.proximasTitulo}
          </h2>
          {customer.upcoming.length === 0 ? (
            <p className="text-13 text-muted">{clientes.ficha.proximasVacio}</p>
          ) : (
            <ul>
              {customer.upcoming.map((b) => (
                <BookingRow key={b.id} booking={b} />
              ))}
            </ul>
          )}
        </Card>

        <Card radius="tile" padding="lg" className="flex flex-col gap-1">
          <h2 className="mb-2 text-15 font-bold text-ink">
            {clientes.ficha.historialTitulo}
          </h2>
          {customer.history.length === 0 ? (
            <p className="text-13 text-muted">
              {clientes.ficha.historialVacio}
            </p>
          ) : (
            <ul>
              {customer.history.map((b) => (
                <BookingRow key={b.id} booking={b} />
              ))}
            </ul>
          )}
        </Card>

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

        <Card
          radius="tile"
          padding="lg"
          className="flex flex-col gap-3 lg:col-span-2"
        >
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
        </Card>

        {customer.isOwner && onExportCustomer && onAnonymizeCustomer ? (
          <div className="lg:col-span-2">
            <CustomerPrivacyActions
              customerId={customer.id}
              onExport={() => onExportCustomer(customer.id)}
              onAnonymize={() => onAnonymizeCustomer(customer.id)}
              onAnonymized={() => {
                router.push("/app/clientes");
              }}
            />
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
