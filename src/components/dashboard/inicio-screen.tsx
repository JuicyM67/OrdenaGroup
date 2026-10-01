"use client";

// Se DESIGN.md §7 (AppShell, OwnerPageHeader, NextClientCard, StatTile, AgendaToday,
// FlashCard, GettingStartedCard) och docs/tasks/plans/WP-11.md §4 steg 6, ombyggd i WP-57
// (ägarens UX-genomgång, "Inicio som 'dagens läge', inte en reklamyta"): den stora mörka
// hero-ytan (HeroSummary/FeatureCard/CalendarCard) är borta. Överst är nu det som kräver
// handling idag (nästa kund + förfrågningar som väntar), en kompakt KPI-rad och ett
// "Kom igång"-kort som döljs när allt är klart. Ingen `new Date()` här — `data.now` är den
// enda klockan, och parsas en gång.
//
// WP-47: "use client" (tidigare en ren servrad komposition) — Llegó/No vino/Mover från
// "…"-menyn (agenda-row.tsx) och klockan (OwnerPageHeader, via OwnerChromeProvider) behöver
// lokalt tillstånd/`useRouter`, samma mönster som agenda-screen.tsx.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MoveDialog } from "@/components/agenda/move-dialog";
import type { AgendaActionResult } from "@/components/agenda/agenda-screen";
import { OwnerPageHeader } from "@/components/shared/owner-page-header";
import { TuLinkCard } from "@/components/shared/tu-link-card";
import type {
  MyProfileActions,
  MyProfileData,
} from "@/components/shared/my-profile-dialog";
import type { NotificationBellResult } from "@/components/shared/notification-bell";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { agenda, inicio } from "@/i18n";
import { formatMoney } from "@/lib/format/money";
import {
  APP_TZ,
  toWallClock,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";
import { formatPercent } from "@/lib/format/percent";

import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";

import { AgendaToday } from "./agenda-today";
import { AppShell } from "./app-shell";
import { FlashCard } from "./flash-card";
import { GettingStartedCard } from "./getting-started-card";
import {
  mustParseInstant,
  noShowTrendLabel,
  todayLabel,
  upcomingToday,
} from "./inicio-view";
import { MainNav } from "./main-nav";
import { NextClientCard } from "./next-client-card";
import { PendingRequestsCard } from "./pending-requests-card";
import { StatTile } from "./stat-tile";
import type { InicioData, TodayBooking } from "./types";
import { UpcomingBookingsCard } from "./upcoming-bookings-card";

export type InicioScreenProps = {
  data: InicioData;
  /**
   * Overridar AppShell:s standardhöjd (`h-dvh`). Design lab-sidan skickar `h-225`
   * (artboardens fasta 900 px, se docs/tasks/plans/WP-11.md §4 steg 3/7) — samma
   * höjdklassgrupp, så `cn()` (tailwind-merge) låter den vinna.
   */
  shellClassName?: string;
  /**
   * Slug/nombre para la tarjeta "Tu link de reservas" (aside). Solo se pasa desde la
   * página real /app/inicio — el design lab (fixtures) no lo incluye.
   */
  bookingLink?: { slug: string; businessName: string };
  /** WP-47: Llegó/No vino (server action, `markArrival`). `undefined` i design lab. */
  onArrival?: (
    bookingId: string,
    status: "completed" | "no_show",
  ) => void | Promise<void>;
  /** WP-47: "Mover" (server action, `moveOwnerBooking`, delad med Agenda). `undefined` i
   * design lab — menyposten "Mover" döljs då (agenda-row.tsx). */
  onMoveBooking?: (input: {
    bookingId: string;
    date: LocalDate;
    time: LocalTime;
  }) => Promise<AgendaActionResult>;
  /** WP-47: `logout` (server action). `undefined` i design lab. */
  onLogout?: () => void | Promise<void>;
  /** WP-45 (D-033): klockan + listan "Att bekräfta" (överst). `undefined` i design lab —
   * döljer båda. */
  onConfirmRequest?: (bookingId: string) => Promise<NotificationBellResult>;
  onDeclineRequest?: (
    bookingId: string,
    reason?: string,
  ) => Promise<NotificationBellResult>;
  /** WP-56: se `notification-bell.tsx`. */
  onApproveCancelRequest?: (
    bookingId: string,
  ) => Promise<NotificationBellResult>;
  onDeclineCancelRequest?: (
    bookingId: string,
  ) => Promise<NotificationBellResult>;
  /** WP-46: "Min profil" i kontomenyn. `undefined` döljer menyposten (ägare
   * utan egen personalrad, design lab). */
  myProfile?: MyProfileData;
  myProfileActions?: MyProfileActions;
};

const AGENDA_HREF = "/app/agenda";

export function InicioScreen({
  data,
  shellClassName,
  bookingLink,
  onArrival,
  onMoveBooking,
  onLogout,
  onConfirmRequest,
  onDeclineRequest,
  onApproveCancelRequest,
  onDeclineCancelRequest,
  myProfile,
  myProfileActions,
}: InicioScreenProps) {
  const router = useRouter();
  const now = mustParseInstant(data.now, "InicioScreen");
  const publicPageHref = bookingLink ? `/${bookingLink.slug}` : "/";
  const canViewReports = data.member?.perms.can_view_reports ?? true;

  // WP-47: Llegó/No vino från "…"-menyn (agenda-row.tsx) och nästa kund-kortet tar bort
  // raden optimistiskt ur "Agenda de hoy" (den är inte längre "kommande") i stället för att
  // bara byta chip — samma status filtreras redan bort av `upcomingToday` när servern
  // skickar den på nytt.
  const [handledIds, setHandledIds] = useState<ReadonlySet<string>>(new Set());
  const [movingBooking, setMovingBooking] = useState<TodayBooking | null>(null);
  const [nextBusy, setNextBusy] = useState(false);

  const bookings = upcomingToday(data.today, now).filter(
    (b) => !handledIds.has(b.id),
  );
  const nextClient = bookings[0];

  function handleArrival(bookingId: string, status: "completed" | "no_show") {
    setHandledIds((prev) => new Set(prev).add(bookingId));
    void Promise.resolve(onArrival?.(bookingId, status)).catch(() => undefined);
  }

  function handleNextArrival(status: "completed" | "no_show") {
    if (!nextClient || nextBusy) return;
    setNextBusy(true);
    handleArrival(nextClient.id, status);
    window.setTimeout(() => setNextBusy(false), 400);
  }

  const showPending =
    Boolean(onConfirmRequest && onDeclineRequest) &&
    data.notifications.items.length > 0;

  const gettingStarted = data.gettingStarted;
  const showGettingStarted =
    gettingStarted != null &&
    !(
      gettingStarted.services &&
      gettingStarted.hours &&
      gettingStarted.profile &&
      gettingStarted.flash &&
      gettingStarted.team
    );

  return (
    <AppShell
      rail={
        <MainNav
          active="inicio"
          onLogout={onLogout}
          canViewReports={data.member?.perms.can_view_reports}
        />
      }
      mobileTabBar={
        <OwnerMobileTabBar
          active="inicio"
          className="lg:hidden"
          canViewReports={data.member?.perms.can_view_reports}
          onLogout={onLogout}
        />
      }
      onLogout={onLogout}
      ownerName={data.owner.name}
      publicPageHref={publicPageHref}
      canViewReports={data.member?.perms.can_view_reports}
      myProfile={myProfile}
      myProfileActions={myProfileActions}
      pendingRequests={data.notifications.items}
      onConfirmRequest={onConfirmRequest}
      onDeclineRequest={onDeclineRequest}
      onApproveCancelRequest={onApproveCancelRequest}
      onDeclineCancelRequest={onDeclineCancelRequest}
      hideMobileTopBar
      className={shellClassName}
    >
      <OwnerPageHeader
        title={inicio.hola({ nombre: data.owner.firstName })}
        subtitle={inicio.metaRow({
          fecha: todayLabel(now),
          negocio: data.business.name,
          comuna: data.business.comuna,
        })}
        actions={
          <Button variant="primary" size="lg" asChild>
            <Link href={AGENDA_HREF} prefetch={false}>
              {agenda.nuevaReserva}
            </Link>
          </Button>
        }
      />

      <div
        className={cn(
          "grid gap-4",
          showPending ? "lg:grid-cols-3" : "lg:grid-cols-1",
        )}
      >
        <div className={showPending ? "lg:col-span-2" : undefined}>
          <NextClientCard
            booking={nextClient}
            now={now}
            disabled={nextBusy}
            onArrived={
              onArrival ? () => handleNextArrival("completed") : undefined
            }
            onNoShow={
              onArrival ? () => handleNextArrival("no_show") : undefined
            }
          />
        </div>
        {showPending && onConfirmRequest && onDeclineRequest ? (
          <PendingRequestsCard
            requests={data.notifications.items}
            onConfirm={async (bookingId) => {
              const result = await onConfirmRequest(bookingId);
              if (result.ok) router.refresh();
              return result;
            }}
            onDecline={async (bookingId, reason) => {
              const result = await onDeclineRequest(bookingId, reason);
              if (result.ok) router.refresh();
              return result;
            }}
            onApproveCancel={
              onApproveCancelRequest
                ? async (bookingId) => {
                    const result = await onApproveCancelRequest(bookingId);
                    if (result.ok) router.refresh();
                    return result;
                  }
                : undefined
            }
            onDeclineCancel={
              onDeclineCancelRequest
                ? async (bookingId) => {
                    const result = await onDeclineCancelRequest(bookingId);
                    if (result.ok) router.refresh();
                    return result;
                  }
                : undefined
            }
          />
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          variant="number"
          value={data.stats.bookingsToday}
          meta={inicio.stats.reservasHoy({ n: data.stats.toConfirm })}
        />
        {canViewReports ? (
          <StatTile
            variant="amount"
            value={formatMoney(data.stats.revenueWeekClp)}
            meta={inicio.stats.ingresosSemana}
            series={data.stats.revenueSeries}
          />
        ) : null}
        <StatTile
          variant="percent"
          value={formatPercent(data.stats.noShowPct)}
          meta={inicio.stats.inasistencias}
          trend={data.stats.noShowTrend}
          trendLabel={noShowTrendLabel(data.stats.noShowTrend)}
        />
        <StatTile
          variant="number"
          value={data.features.waitlist.count}
          meta={inicio.features.listaEspera.titulo}
        />
      </div>

      {showGettingStarted ? <GettingStartedCard data={gettingStarted} /> : null}

      <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row">
        <div className="flex flex-col gap-5 lg:min-h-0 lg:min-w-0 lg:flex-1">
          <AgendaToday
            bookings={bookings}
            href={AGENDA_HREF}
            onArrival={onArrival ? handleArrival : undefined}
            onMover={onMoveBooking ? setMovingBooking : undefined}
          />
        </div>

        <aside className="flex w-full flex-col gap-4 lg:w-90 lg:shrink-0 lg:overflow-y-auto">
          <FlashCard activeFlash={data.activeFlash} />
          <UpcomingBookingsCard bookings={data.upcoming} href={AGENDA_HREF} />
          {bookingLink ? (
            <TuLinkCard
              slug={bookingLink.slug}
              businessName={bookingLink.businessName}
            />
          ) : null}
        </aside>
      </div>

      {onMoveBooking && movingBooking ? (
        <MoveDialog
          key={movingBooking.id}
          open={movingBooking != null}
          onOpenChange={(open) => {
            if (!open) setMovingBooking(null);
          }}
          bookingId={movingBooking.id}
          defaultDate={
            toWallClock(
              mustParseInstant(movingBooking.start, "InicioScreen"),
              APP_TZ,
            ).date
          }
          defaultTime={
            toWallClock(
              mustParseInstant(movingBooking.start, "InicioScreen"),
              APP_TZ,
            ).time
          }
          onSubmit={async (input) => {
            const result = await onMoveBooking(input);
            if (result.ok) {
              setHandledIds((prev) => new Set(prev).add(movingBooking.id));
              setMovingBooking(null);
              router.refresh();
            }
            return result;
          }}
        />
      ) : null}
    </AppShell>
  );
}
