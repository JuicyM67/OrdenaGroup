"use client";

// InformesScreen — /app/caja/informes (WP-24, F10; flyttad från CajaScreens
// andra flik till en egen vy i WP-57: "Caja e informes" hade två flikrader
// på varandra, se review.tpl.html §Caja). Fyra enkla grafer med tokens,
// ingen ny dependency (`charts.tsx`).
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { AppShell } from "@/components/dashboard/app-shell";
import { MainNav } from "@/components/dashboard/main-nav";
import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";
import type {
  MyProfileActions,
  MyProfileData,
} from "@/components/shared/my-profile-dialog";
import { OwnerPageHeader } from "@/components/shared/owner-page-header";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { strokeArrow } from "@/components/ui/icons";
import { appHref } from "@/config/routes";
import { caja, comun } from "@/i18n";
import {
  formatDuration,
  formatLocalDate,
  type LocalDate,
} from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { ArrowLeft } from "lucide-react";

import {
  ChartCardTitle,
  ShareBarList,
  StackedWeekBars,
  WeekBars,
  type ShareBarRow,
  type StackedWeekBar,
  type WeekBar,
} from "./charts";
import type { InformesResult } from "./types";

export type InformesScreenProps = {
  loadInformes: () => Promise<InformesResult>;
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
  /** WP-73 (D-048): uppgraderingsrutan när planen saknar full rapportvy —
   * ersätter rapporterna (inget laddas). */
  planNotice?: ReactNode;
};

function shortWeekLabel(weekStart: LocalDate): string {
  return `${weekStart.slice(8, 10)}/${weekStart.slice(5, 7)}`;
}

function weekTitle(weekStart: LocalDate): string {
  return formatLocalDate(weekStart, "dayMonthLong");
}

export function InformesScreen({
  loadInformes,
  canViewReports,
  onLogout,
  ownerName,
  publicPageHref,
  myProfile,
  myProfileActions,
  planNotice,
}: InformesScreenProps) {
  const [result, setResult] = useState<InformesResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (planNotice) return;
    let active = true;
    void loadInformes().then((r) => {
      if (active) {
        setResult(r);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
    // `loadInformes` är en stabil server action-referens (samma mönster som
    // `loadCaja` i `caja-screen.tsx`, aldrig med i dependency-listan).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <OwnerPageHeader
        title={
          <span className="flex items-center gap-3">
            <IconButton label={comun.volver} tone="ghost" size={36} asChild>
              <Link href={appHref("appCaja")}>
                <ArrowLeft
                  aria-hidden="true"
                  className="size-4.5"
                  strokeWidth={strokeArrow}
                />
              </Link>
            </IconButton>
            {caja.tabs.informes}
          </span>
        }
      />

      {planNotice ? (
        planNotice
      ) : loading || !result ? (
        <p role="status" className="text-13 text-muted">
          {comun.cargando}
        </p>
      ) : "forbidden" in result ? (
        <Card radius="tile" padding="lg" className="text-14 text-muted">
          {comun.algoSalioMal}
        </Card>
      ) : (
        <InformesGrid result={result} />
      )}
    </AppShell>
  );
}

function InformesGrid({
  result,
}: {
  result: Exclude<InformesResult, { forbidden: true }>;
}) {
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
