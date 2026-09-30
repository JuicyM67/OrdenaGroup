"use client";

// Se DESIGN.md §7 (AppShell, PageHeader, HeroSummary, StatTile, AgendaToday, CalendarCard,
// FlashCard) och docs/tasks/plans/WP-11.md §4 steg 6. Sätter ihop hela Inicio-skärmen ur en
// typad vy-modell (`InicioData`). Ingen `new Date()` här — `data.now` är den enda klockan,
// och parsas en gång.
//
// WP-47: "use client" (tidigare en ren servrad komposition) — Llegó/No vino/Mover från
// "…"-menyn (agenda-row.tsx) och profilmenyn (UserMenu) behöver lokalt tillstånd/
// `useRouter`, samma mönster som agenda-screen.tsx.
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MoveDialog } from "@/components/agenda/move-dialog";
import type { AgendaActionResult } from "@/components/agenda/agenda-screen";
import { PageHeader } from "@/components/ui/page-header";
import {
  NotificationBell,
  type NotificationBellResult,
} from "@/components/shared/notification-bell";
import { TuLinkCard } from "@/components/shared/tu-link-card";
import { UserMenu } from "@/components/shared/user-menu";
import { inicio } from "@/i18n";
import { formatMoney } from "@/lib/format/money";
import {
  APP_TZ,
  toLocalDate,
  toWallClock,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";
import { initialsOf } from "@/lib/format/initials";
import { formatPercent } from "@/lib/format/percent";

import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";

import { AgendaToday } from "./agenda-today";
import { AppShell } from "./app-shell";
import { CalendarCard } from "./calendar-card";
import { FlashCard } from "./flash-card";
import { HeroSummary } from "./hero-summary";
import {
  mustParseInstant,
  noShowTrendLabel,
  todayLabel,
  upcomingToday,
} from "./inicio-view";
import { MainNav } from "./main-nav";
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
   * página real /app/inicio — el design lab (fixtures) no lo incluye, así que
   * `npm run visual main` sigue comparando exactamente el mismo árbol que hoy.
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
  /** WP-45 (D-033): klockan (topprad) + listan "Att bekräfta" (överst i
   * spalten). `undefined` i design lab — döljer båda. */
  onConfirmRequest?: (bookingId: string) => Promise<NotificationBellResult>;
  onDeclineRequest?: (
    bookingId: string,
    reason?: string,
  ) => Promise<NotificationBellResult>;
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
}: InicioScreenProps) {
  const router = useRouter();
  const now = mustParseInstant(data.now, "InicioScreen");
  const publicPageHref = bookingLink ? `/${bookingLink.slug}` : "/";

  // WP-47: Llegó/No vino från "…"-menyn (agenda-row.tsx) tar bort raden optimistiskt ur
  // "Agenda de hoy" (den är inte längre "kommande") i stället för att bara byta chip — samma
  // status filtreras redan bort av `upcomingToday` när servern skickar den på nytt.
  const [handledIds, setHandledIds] = useState<ReadonlySet<string>>(new Set());
  const [movingBooking, setMovingBooking] = useState<TodayBooking | null>(null);

  const bookings = upcomingToday(data.today, now).filter(
    (b) => !handledIds.has(b.id),
  );

  function handleArrival(bookingId: string, status: "completed" | "no_show") {
    setHandledIds((prev) => new Set(prev).add(bookingId));
    void Promise.resolve(onArrival?.(bookingId, status)).catch(() => undefined);
  }

  return (
    <AppShell
      rail={<MainNav active="inicio" onLogout={onLogout} />}
      mobileTabBar={<OwnerMobileTabBar active="inicio" className="lg:hidden" />}
      onLogout={onLogout}
      className={shellClassName}
    >
      <PageHeader
        variant="desktop"
        title={inicio.titulo}
        meta={inicio.metaRow({
          fecha: todayLabel(now),
          negocio: data.business.name,
          comuna: data.business.comuna,
        })}
        actions={
          <>
            {/* WP-47: sökikonen döljs tills sök finns (WP-xx: visas när funktionen finns) —
                ledde till en 404, ingen route lyssnar på sökningar än. */}
            {onConfirmRequest && onDeclineRequest ? (
              <NotificationBell
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
                withTooltip
              />
            ) : null}
            <span className="hidden lg:contents">
              <UserMenu
                name={data.owner.name}
                initials={initialsOf(data.owner.name)}
                variant="pill"
                publicPageHref={publicPageHref}
                onLogout={onLogout}
              />
            </span>
            <span className="contents lg:hidden">
              <UserMenu
                name={data.owner.name}
                initials={initialsOf(data.owner.name)}
                variant="avatar"
                publicPageHref={publicPageHref}
                onLogout={onLogout}
              />
            </span>
          </>
        }
      />

      <HeroSummary
        ownerFirstName={data.owner.firstName}
        week={data.week}
        features={data.features}
      />

      {onConfirmRequest && onDeclineRequest ? (
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
        />
      ) : null}

      <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row">
        <div className="flex flex-col gap-5 lg:min-h-0 lg:min-w-0 lg:flex-1">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <StatTile
              variant="number"
              value={data.stats.bookingsToday}
              meta={inicio.stats.reservasHoy({ n: data.stats.toConfirm })}
            />
            <StatTile
              variant="amount"
              value={formatMoney(data.stats.revenueWeekClp)}
              meta={inicio.stats.ingresosSemana}
              series={data.stats.revenueSeries}
            />
            <StatTile
              variant="percent"
              value={formatPercent(data.stats.noShowPct)}
              meta={inicio.stats.inasistencias}
              trend={data.stats.noShowTrend}
              trendLabel={noShowTrendLabel(data.stats.noShowTrend)}
            />
          </div>

          <AgendaToday
            bookings={bookings}
            href={AGENDA_HREF}
            onArrival={onArrival ? handleArrival : undefined}
            onMover={onMoveBooking ? setMovingBooking : undefined}
          />
        </div>

        <aside className="flex w-full flex-col gap-4 lg:w-90 lg:shrink-0 lg:overflow-y-auto">
          <CalendarCard
            month={data.calendar.month}
            today={toLocalDate(now, APP_TZ)}
            markedDates={data.calendar.markedDates}
          />
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
