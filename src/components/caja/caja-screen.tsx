"use client";

// CajaScreen — /app/caja (WP-24, F10; WP-57 UX-ombyggnad). Samma skal som
// Inicio/Ajustes/Clientes. Alla summor kommer redan uträknade från servern
// (`loadCajaAction`, SQL) — UI:t räknar aldrig pengar. Informes (fyra
// enkla grafer) har en egen vy (`/app/caja/informes`, `informes-screen.tsx`)
// i stället för en andra flikrad (WP-57, fel/observation "Caja": "Två
// flikrader på varandra gör det svårt att se var man är").
//
// WP-57 ("Caja"): "Att ta betalt för" överst med betalmetods-pills direkt på
// raden (ett tryck = `markPaidAction` med den återstående summan, ingen
// dialog), ett stort mörkt "Inkasserat"-kort med "de X reservado" och en
// stapel, en enda periodrad (Idag/Semana/Mes/Rango) och fördelningskorten
// dolda när perioden inte har några betalningar.
import Link from "next/link";
import { useState } from "react";

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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DateField } from "@/components/ui/date-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { appHref } from "@/config/routes";
import { caja, comun, regalo } from "@/i18n";
import {
  APP_TZ,
  formatDate,
  formatLocalDate,
  formatTime,
  parseInstant,
} from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";

import { ChartCardTitle, ShareBarList, toShareBarRows } from "./charts";
import type {
  CajaActions,
  CajaData,
  CajaPeriod,
  CajaResult,
  ManualPaymentMethod,
  PagoHoyRow,
  PorCobrarRow,
} from "./types";
import { uxTextos } from "@/i18n";

export type CajaScreenProps = {
  initialData: CajaResult;
  manualMethods: readonly ManualPaymentMethod[];
  actions: CajaActions;
  /** WP-24 (D-034): alltid `true` här (sidan redirectar annars), men
   * navigeringen tar samma prop som övriga skärmar. */
  canViewReports?: boolean;
  onLogout?: () => void | Promise<void>;
  /** WP-57 punkt 7: `<OwnerPageHeader>` (klocka + profilmeny), samma data
   * som Inicio skickar till `AppShell` (`owner-chrome.tsx`). */
  ownerName: string;
  publicPageHref: string;
  myProfile?: MyProfileData;
  myProfileActions?: MyProfileActions;
};

type PeriodKind = "today" | "week" | "month" | "range";

function undoErrorText(code: string): string {
  switch (code) {
    case "same_day_required":
      return caja.errores.same_day_required;
    default:
      return comun.algoSalioMal;
  }
}

/** Samma mapping som `MarkPaidDialog` (`mark-paid-dialog.tsx`), duplicerad
 * här eftersom en-tryck-raden inte längre öppnar den dialogen (WP-57). */
function markPaidErrorText(code: string): string {
  switch (code) {
    case "already_paid":
      return caja.errores.already_paid;
    case "booking_cancelled":
      return caja.errores.booking_cancelled;
    case "invalid_amount":
    case "invalid_method":
      return caja.errores.invalid_amount;
    default:
      return comun.algoSalioMal;
  }
}

function methodLabel(key: string): string {
  return (caja.metodo as Record<string, string>)[key] ?? key;
}

function rowDateTime(iso: string): string {
  const parsed = parseInstant(iso);
  if (!parsed.ok) return iso;
  return `${formatDate(parsed.value, APP_TZ, "weekdayDayMonthShort")} · ${formatTime(parsed.value, APP_TZ)}`;
}

function rowTime(iso: string): string {
  const parsed = parseInstant(iso);
  if (!parsed.ok) return iso;
  return formatTime(parsed.value, APP_TZ);
}

export function CajaScreen({
  initialData,
  manualMethods,
  actions,
  canViewReports,
  onLogout,
  ownerName,
  publicPageHref,
  myProfile,
  myProfileActions,
}: CajaScreenProps) {
  const [periodKind, setPeriodKind] = useState<PeriodKind>("today");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [data, setData] = useState<CajaResult>(initialData);
  const [loadingCaja, setLoadingCaja] = useState(false);

  const [undoTarget, setUndoTarget] = useState<PagoHoyRow | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);

  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const [payError, setPayError] = useState<{
    bookingId: string;
    message: string;
  } | null>(null);

  function currentPeriod(): CajaPeriod {
    return periodKind === "range"
      ? { kind: "range", from: rangeFrom, to: rangeTo }
      : { kind: periodKind };
  }

  async function reloadCaja(period: CajaPeriod) {
    setLoadingCaja(true);
    const result = await actions.loadCaja(period);
    setData(result);
    setLoadingCaja(false);
    if ("invalid" in result) setRangeError(caja.rangoPersonalizado.error);
    else setRangeError(null);
  }

  function handlePeriodChange(next: PeriodKind) {
    setPeriodKind(next);
    if (next === "range") return; // väntar på "Aplicar"
    void reloadCaja({ kind: next });
  }

  function handleApplyRange() {
    if (!rangeFrom || !rangeTo) return;
    void reloadCaja({ kind: "range", from: rangeFrom, to: rangeTo });
  }

  async function handleUndo() {
    if (!undoTarget) return;
    const result = await actions.undoPayment({
      paymentId: undoTarget.paymentId,
    });
    if (result.ok) {
      setUndoTarget(null);
      setUndoError(null);
      void reloadCaja(currentPeriod());
    } else {
      setUndoError(undoErrorText(result.code));
    }
  }

  async function handleMarkPaidInline(
    bookingId: string,
    method: ManualPaymentMethod,
  ) {
    if (payingBookingId) return;
    setPayingBookingId(bookingId);
    setPayError(null);
    const result = await actions.markPaid({ bookingId, method });
    setPayingBookingId(null);
    if (result.ok) {
      void reloadCaja(currentPeriod());
    } else {
      setPayError({ bookingId, message: markPaidErrorText(result.code) });
    }
  }

  const cajaData: CajaData | null =
    data && !("forbidden" in data) && !("invalid" in data) ? data : null;

  const totalBookedMinor = cajaData
    ? cajaData.summary.revenueMinor + cajaData.summary.expectedMinor
    : 0;
  const collectedPct =
    cajaData && totalBookedMinor > 0
      ? Math.min(
          100,
          Math.round((cajaData.summary.revenueMinor / totalBookedMinor) * 100),
        )
      : 0;
  const hasBreakdown = !!(
    cajaData &&
    (cajaData.byMethod.length > 0 ||
      cajaData.byStaff.length > 0 ||
      cajaData.byService.length > 0)
  );

  return (
    <AppShell
      rail={
        <MainNav
          active="caja"
          onLogout={onLogout}
          canViewReports={canViewReports}
        />
      }
      mobileTabBar={
        <OwnerMobileTabBar
          active="caja"
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
      <OwnerPageHeader title={caja.tabs.caja} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            aria-label={caja.tabs.caja}
            value={periodKind}
            onValueChange={(v) => handlePeriodChange(v as PeriodKind)}
            options={[
              { value: "today", label: caja.periodos.hoy },
              { value: "week", label: caja.periodos.semana },
              { value: "month", label: caja.periodos.mes },
              { value: "range", label: caja.periodos.rango },
            ]}
            className="w-fit"
            // WP-60 fynd: 4 opciones a w-24 (96px) no entraban en 390 px
            // (scroll horizontal) — w-20 angosta sin perder legibilidad.
            itemClassName="w-20"
          />
          <div className="flex flex-wrap gap-2">
            {/* WP-87 (D-073): vender y usar tarjetas de regalo. */}
            <Button asChild variant="secondary" size="sm">
              <Link href={appHref("appCajaTarjetas")}>
                {regalo.caja.enlace} →
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href={appHref("appCajaInformes")}>
                {caja.tabs.informes} →
              </Link>
            </Button>
          </div>
        </div>
        {periodKind === "range" ? (
          <div className="flex flex-wrap items-end gap-3">
            <DateField
              label={caja.rangoPersonalizado.desdeLabel}
              value={rangeFrom}
              onChange={setRangeFrom}
              className="w-44"
            />
            <DateField
              label={caja.rangoPersonalizado.hastaLabel}
              value={rangeTo}
              onChange={setRangeTo}
              className="w-44"
            />
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={handleApplyRange}
            >
              {caja.rangoPersonalizado.ctaAplicar}
            </Button>
          </div>
        ) : null}
        {rangeError ? (
          <p role="alert" className="text-13 text-ink">
            {rangeError}
          </p>
        ) : null}
        {cajaData ? (
          <p className="text-13 text-muted">
            {caja.periodo({
              desde: formatLocalDate(cajaData.period.from, "dayMonthLong"),
              hasta: formatLocalDate(cajaData.period.to, "dayMonthLong"),
            })}
          </p>
        ) : null}
      </div>

      {!cajaData ? (
        <Card radius="tile" padding="lg" className="text-14 text-muted">
          {comun.algoSalioMal}
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            <Card
              radius="tile"
              padding="lg"
              className="flex flex-col gap-3 lg:col-span-3"
            >
              <ChartCardTitle
                title={`${caja.porCobrarLista.titulo} (${cajaData.porCobrar.length})`}
              />
              {cajaData.porCobrar.length === 0 ? (
                <p className="text-13 text-muted">
                  {caja.porCobrarLista.vacio}
                </p>
              ) : (
                <ul className="flex flex-col">
                  {cajaData.porCobrar.map((r: PorCobrarRow) => (
                    <li
                      key={r.bookingId}
                      className="flex flex-col gap-2 border-b border-line py-3 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-14 font-bold text-ink">
                            {r.customerName ?? "—"}
                          </span>
                          <span className="text-13 text-muted">
                            {r.serviceName} · {r.staffName} ·{" "}
                            {rowDateTime(r.start)}
                          </span>
                        </div>
                        <span className="text-14 font-semibold text-ink">
                          {formatMoney(r.priceMinor)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {manualMethods.map((m) => (
                          <Button
                            key={m}
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={payingBookingId === r.bookingId}
                            onClick={() =>
                              void handleMarkPaidInline(r.bookingId, m)
                            }
                          >
                            {methodLabel(m)}
                          </Button>
                        ))}
                      </div>
                      {payError && payError.bookingId === r.bookingId ? (
                        <p role="alert" className="text-13 text-ink">
                          {payError.message}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card
              radius="tile"
              padding="lg"
              tone="dark"
              className="flex flex-col justify-between gap-3 lg:col-span-2"
            >
              <span className="text-13 text-on-dark-soft">
                {caja.resumen.cobrado}
              </span>
              <span className="font-display text-32 font-semibold tracking-display">
                {formatMoney(cajaData.summary.revenueMinor)}
              </span>
              <span className="text-13 text-on-dark-soft">
                {/* TODO_COPY: no hay una frase "de $X reservado" en
                    es-CL.ts — se reutiliza `resumen.reservasCount`
                    (existente) para el conteo de reservas. */}
                {uxTextos.deReservado({ monto: formatMoney(totalBookedMinor) })}{" "}
                · {caja.resumen.reservasCount({ n: cajaData.summary.bookings })}
              </span>
              <div className="h-1.5 overflow-hidden rounded-full bg-dark-2">
                <div
                  className="h-full rounded-full bg-lime"
                  style={{ width: `${collectedPct}%` }}
                />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card
              radius="card"
              padding="none"
              className="flex h-20 flex-col justify-between px-4 py-3"
            >
              <span className="font-display text-18 font-semibold tracking-display whitespace-nowrap">
                {String(cajaData.summary.bookings)}
              </span>
              <span className="text-12 text-muted">
                {caja.resumen.reservasCount({ n: cajaData.summary.bookings })}
              </span>
            </Card>
            <Card
              radius="card"
              padding="none"
              className="flex h-20 flex-col justify-between px-4 py-3"
            >
              <span className="font-display text-18 font-semibold tracking-display whitespace-nowrap">
                {String(cajaData.summary.noShows)}
              </span>
              <span className="text-12 text-muted">
                {caja.resumen.inasistenciasCount({
                  n: cajaData.summary.noShows,
                })}
              </span>
            </Card>
            <Card
              radius="card"
              padding="none"
              className="flex h-20 flex-col justify-between px-4 py-3"
            >
              <span className="font-display text-18 font-semibold tracking-display whitespace-nowrap">
                {formatMoney(cajaData.summary.averageMinor)}
              </span>
              <span className="text-12 text-muted">
                {caja.resumen.ticketPromedio}
              </span>
            </Card>
          </div>
          <p className="text-12 text-muted">{caja.resumen.explicacion}</p>

          {hasBreakdown ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <Card radius="tile" padding="lg" className="flex flex-col gap-3">
                <ChartCardTitle title={caja.distribucion.porMetodo} />
                <ShareBarList
                  rows={toShareBarRows(
                    cajaData.byMethod.map((r) => ({
                      ...r,
                      label: methodLabel(r.key),
                    })),
                    formatMoney,
                  )}
                  emptyLabel={caja.vacioPeriodo}
                />
              </Card>
              <Card radius="tile" padding="lg" className="flex flex-col gap-3">
                <ChartCardTitle title={caja.distribucion.porProfesional} />
                <ShareBarList
                  rows={toShareBarRows(cajaData.byStaff, formatMoney)}
                  emptyLabel={caja.vacioPeriodo}
                />
              </Card>
              <Card radius="tile" padding="lg" className="flex flex-col gap-3">
                <ChartCardTitle title={caja.distribucion.porServicio} />
                <ShareBarList
                  rows={toShareBarRows(cajaData.byService, formatMoney)}
                  emptyLabel={caja.vacioPeriodo}
                />
              </Card>
            </div>
          ) : null}

          <Card radius="tile" padding="lg" className="flex flex-col gap-3">
            <ChartCardTitle title={caja.pagosDeHoy.titulo} />
            {cajaData.pagosHoy.length === 0 ? (
              <p className="text-13 text-muted">{caja.pagosDeHoy.vacio}</p>
            ) : (
              <ul className="flex flex-col">
                {cajaData.pagosHoy.map((p: PagoHoyRow) => (
                  <li
                    key={p.paymentId}
                    className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0 last:pb-0"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-14 font-bold text-ink">
                        {p.customerName ?? "—"}
                      </span>
                      <span className="text-13 text-muted">
                        {methodLabel(p.method)} · {rowTime(p.paidAt)}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-14 font-semibold text-ink">
                        {formatMoney(p.amountMinor)}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setUndoError(null);
                          setUndoTarget(p);
                        }}
                      >
                        {caja.anular.cta}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
      {loadingCaja ? (
        <p role="status" className="text-13 text-muted">
          {comun.cargando}
        </p>
      ) : null}

      <ConfirmDialog
        open={undoTarget != null}
        onOpenChange={(open) => {
          if (!open) setUndoTarget(null);
        }}
        title={caja.anular.tituloConfirmacion}
        body={
          <>
            {caja.anular.cuerpoConfirmacion}
            {undoError ? (
              <span role="alert" className="mt-2 block text-ink">
                {undoError}
              </span>
            ) : null}
          </>
        }
        confirmLabel={caja.anular.cta}
        cancelLabel={comun.volver}
        onConfirm={handleUndo}
      />
    </AppShell>
  );
}
