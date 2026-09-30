"use client";

// CajaScreen — /app/caja (WP-24, F10): flikarna "Caja" (periodens summor,
// fördelningar, att ta betalt för, dagens betalningar) och "Informes" (fyra
// enkla grafer, tokens, ingen ny dependency — `charts.tsx`). Samma skal som
// Inicio/Ajustes/Clientes. Alla summor kommer redan uträknade från servern
// (`loadCajaAction`/`loadInformesAction`, SQL) — UI:t räknar aldrig pengar.
import { useState } from "react";

import { AppShell } from "@/components/dashboard/app-shell";
import { MainNav } from "@/components/dashboard/main-nav";
import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DateField } from "@/components/ui/date-field";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { caja, comun } from "@/i18n";
import {
  APP_TZ,
  formatDate,
  formatDuration,
  formatLocalDate,
  formatTime,
  parseInstant,
  type LocalDate,
} from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";

import {
  ChartCardTitle,
  ShareBarList,
  StackedWeekBars,
  WeekBars,
  toShareBarRows,
  type ShareBarRow,
  type StackedWeekBar,
  type WeekBar,
} from "./charts";
import { MarkPaidDialog } from "./mark-paid-dialog";
import type {
  CajaActions,
  CajaData,
  CajaPeriod,
  CajaResult,
  InformesResult,
  ManualPaymentMethod,
  PagoHoyRow,
  PorCobrarRow,
} from "./types";

export type CajaScreenProps = {
  initialData: CajaResult;
  manualMethods: readonly ManualPaymentMethod[];
  actions: CajaActions;
  /** WP-24 (D-034): alltid `true` här (sidan redirectar annars), men
   * navigeringen tar samma prop som övriga skärmar. */
  canViewReports?: boolean;
  onLogout?: () => void | Promise<void>;
};

type Tab = "caja" | "informes";
type PeriodKind = "today" | "week" | "month" | "range";

function errorText(code: string): string {
  switch (code) {
    case "same_day_required":
      return caja.errores.same_day_required;
    default:
      return comun.algoSalioMal;
  }
}

function shortWeekLabel(weekStart: LocalDate): string {
  return `${weekStart.slice(8, 10)}/${weekStart.slice(5, 7)}`;
}

function weekTitle(weekStart: LocalDate): string {
  return formatLocalDate(weekStart, "dayMonthLong");
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
}: CajaScreenProps) {
  const [tab, setTab] = useState<Tab>("caja");
  const [periodKind, setPeriodKind] = useState<PeriodKind>("today");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [data, setData] = useState<CajaResult>(initialData);
  const [loadingCaja, setLoadingCaja] = useState(false);
  const [informes, setInformes] = useState<InformesResult | null>(null);
  const [loadingInformes, setLoadingInformes] = useState(false);

  const [markPaidTarget, setMarkPaidTarget] = useState<PorCobrarRow | null>(
    null,
  );
  const [undoTarget, setUndoTarget] = useState<PagoHoyRow | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);

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

  async function ensureInformes() {
    if (informes || loadingInformes) return;
    setLoadingInformes(true);
    setInformes(await actions.loadInformes());
    setLoadingInformes(false);
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
      setUndoError(errorText(result.code));
    }
  }

  const cajaData: CajaData | null =
    data && !("forbidden" in data) && !("invalid" in data) ? data : null;

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
    >
      <PageHeader variant="desktop" title={caja.tabs.caja} />

      <div role="tablist" aria-label={caja.tabs.caja} className="flex gap-1.5">
        <Button
          type="button"
          role="tab"
          aria-selected={tab === "caja"}
          variant={tab === "caja" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setTab("caja")}
        >
          {caja.tabs.caja}
        </Button>
        <Button
          type="button"
          role="tab"
          aria-selected={tab === "informes"}
          variant={tab === "informes" ? "primary" : "secondary"}
          size="sm"
          onClick={() => {
            setTab("informes");
            void ensureInformes();
          }}
        >
          {caja.tabs.informes}
        </Button>
      </div>

      {tab === "caja" ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
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
            />
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
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <SummaryTile
                  label={caja.resumen.cobrado}
                  value={formatMoney(cajaData.summary.revenueMinor)}
                />
                <SummaryTile
                  label={caja.resumen.porCobrar}
                  value={formatMoney(cajaData.summary.expectedMinor)}
                />
                <SummaryTile
                  label={caja.resumen.reservasCount({
                    n: cajaData.summary.bookings,
                  })}
                  value={String(cajaData.summary.bookings)}
                />
                <SummaryTile
                  label={caja.resumen.inasistenciasCount({
                    n: cajaData.summary.noShows,
                  })}
                  value={String(cajaData.summary.noShows)}
                />
                <SummaryTile
                  label={caja.resumen.ticketPromedio}
                  value={formatMoney(cajaData.summary.averageMinor)}
                />
              </div>
              <p className="text-12 text-muted">{caja.resumen.explicacion}</p>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card
                  radius="tile"
                  padding="lg"
                  className="flex flex-col gap-3"
                >
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
                <Card
                  radius="tile"
                  padding="lg"
                  className="flex flex-col gap-3"
                >
                  <ChartCardTitle title={caja.distribucion.porProfesional} />
                  <ShareBarList
                    rows={toShareBarRows(cajaData.byStaff, formatMoney)}
                    emptyLabel={caja.vacioPeriodo}
                  />
                </Card>
                <Card
                  radius="tile"
                  padding="lg"
                  className="flex flex-col gap-3"
                >
                  <ChartCardTitle title={caja.distribucion.porServicio} />
                  <ShareBarList
                    rows={toShareBarRows(cajaData.byService, formatMoney)}
                    emptyLabel={caja.vacioPeriodo}
                  />
                </Card>
              </div>

              <Card radius="tile" padding="lg" className="flex flex-col gap-3">
                <ChartCardTitle title={caja.porCobrarLista.titulo} />
                {cajaData.porCobrar.length === 0 ? (
                  <p className="text-13 text-muted">
                    {caja.porCobrarLista.vacio}
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {cajaData.porCobrar.map((r) => (
                      <li
                        key={r.bookingId}
                        className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0 last:pb-0"
                      >
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-14 font-bold text-ink">
                            {r.customerName ?? "—"}
                          </span>
                          <span className="text-13 text-muted">
                            {r.serviceName} · {r.staffName} ·{" "}
                            {rowDateTime(r.start)}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-14 font-semibold text-ink">
                            {formatMoney(r.priceMinor)}
                          </span>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setMarkPaidTarget(r)}
                          >
                            {caja.marcarPagada.cta}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card radius="tile" padding="lg" className="flex flex-col gap-3">
                <ChartCardTitle title={caja.pagosDeHoy.titulo} />
                {cajaData.pagosHoy.length === 0 ? (
                  <p className="text-13 text-muted">{caja.pagosDeHoy.vacio}</p>
                ) : (
                  <ul className="flex flex-col">
                    {cajaData.pagosHoy.map((p) => (
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
            </>
          )}
          {loadingCaja ? (
            <p role="status" className="text-13 text-muted">
              {comun.cargando}
            </p>
          ) : null}
        </div>
      ) : (
        <InformesTab result={informes} loading={loadingInformes} />
      )}

      {markPaidTarget ? (
        <MarkPaidDialog
          open={markPaidTarget != null}
          onOpenChange={(open) => {
            if (!open) setMarkPaidTarget(null);
          }}
          bookingId={markPaidTarget.bookingId}
          dueMinor={markPaidTarget.priceMinor}
          methods={manualMethods}
          onSubmit={actions.markPaid}
          onPaid={() => {
            setMarkPaidTarget(null);
            void reloadCaja(currentPeriod());
          }}
        />
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

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <Card
      radius="card"
      padding="none"
      className="flex h-24 flex-col justify-between px-4 py-3.5"
    >
      <span className="font-display text-22 font-semibold tracking-display whitespace-nowrap">
        {value}
      </span>
      <span className="text-12 text-muted">{label}</span>
    </Card>
  );
}

function InformesTab({
  result,
  loading,
}: {
  result: InformesResult | null;
  loading: boolean;
}) {
  if (loading || !result) {
    return (
      <p role="status" className="text-13 text-muted">
        {comun.cargando}
      </p>
    );
  }
  if ("forbidden" in result) {
    return (
      <Card radius="tile" padding="lg" className="text-14 text-muted">
        {comun.algoSalioMal}
      </Card>
    );
  }

  const maxWeekly = Math.max(0, ...result.weekly.map((w) => w.revenueMinor));
  const weeklyBars: WeekBar[] = result.weekly.map((w) => ({
    key: w.weekStart,
    shortLabel: shortWeekLabel(w.weekStart),
    title: `${weekTitle(w.weekStart)}: ${formatMoney(w.revenueMinor)}`,
    pct: maxWeekly > 0 ? Math.round((w.revenueMinor / maxWeekly) * 100) : 0,
  }));

  const noShowBars: WeekBar[] = result.noShowTrend.map((w) => ({
    key: w.weekStart,
    shortLabel: shortWeekLabel(w.weekStart),
    title: `${weekTitle(w.weekStart)}: ${w.pct}%`,
    pct: w.pct,
  }));

  const maxNvr = Math.max(
    1,
    ...result.newVsReturning.map((w) => w.nuevos + w.recurrentes),
  );
  const nvrBars: StackedWeekBar[] = result.newVsReturning.map((w) => ({
    key: w.weekStart,
    shortLabel: shortWeekLabel(w.weekStart),
    title: `${weekTitle(w.weekStart)}: ${w.nuevos} + ${w.recurrentes}`,
    primaryPct: Math.round((w.nuevos / maxNvr) * 100),
    secondaryPct: Math.round((w.recurrentes / maxNvr) * 100),
  }));

  const occupancyRows: ShareBarRow[] = result.occupancyByStaff.map((s) => ({
    key: s.staffId,
    label: s.name,
    trailing: `${formatDuration(s.bookedMinutes)} / ${formatDuration(s.availableMinutes)}`,
    pct:
      s.availableMinutes > 0
        ? Math.min(
            100,
            Math.round((s.bookedMinutes / s.availableMinutes) * 100),
          )
        : 0,
  }));

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card radius="tile" padding="lg" className="flex flex-col gap-3">
        <ChartCardTitle
          title={caja.informes.ingresosPorSemana.titulo}
          subtitle={caja.informes.ingresosPorSemana.subtitulo}
        />
        <WeekBars bars={weeklyBars} emptyLabel={caja.informes.vacio} />
      </Card>
      <Card radius="tile" padding="lg" className="flex flex-col gap-3">
        <ChartCardTitle title={caja.informes.ocupacionPorProfesional.titulo} />
        <ShareBarList rows={occupancyRows} emptyLabel={caja.informes.vacio} />
      </Card>
      <Card radius="tile" padding="lg" className="flex flex-col gap-3">
        <ChartCardTitle title={caja.informes.nuevosVsRecurrentes.titulo} />
        <StackedWeekBars
          bars={nvrBars}
          primaryLabel={caja.informes.nuevosVsRecurrentes.nuevos}
          secondaryLabel={caja.informes.nuevosVsRecurrentes.recurrentes}
          emptyLabel={caja.informes.vacio}
        />
      </Card>
      <Card radius="tile" padding="lg" className="flex flex-col gap-3">
        <ChartCardTitle title={caja.informes.tendenciaInasistencias.titulo} />
        <WeekBars bars={noShowBars} emptyLabel={caja.informes.vacio} />
      </Card>
    </div>
  );
}
