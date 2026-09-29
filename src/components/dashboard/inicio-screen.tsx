// Se DESIGN.md §7 (AppShell, PageHeader, HeroSummary, StatTile, AgendaToday, CalendarCard,
// FlashCard) och docs/tasks/plans/WP-11.md §4 steg 6. Sätter ihop hela Inicio-skärmen ur en
// typad vy-modell (`InicioData`). Ingen `new Date()` här — `data.now` är den enda klockan,
// och parsas en gång.
import { Bell, Search } from "lucide-react";

import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { UserPill } from "@/components/ui/user-pill";
import { TuLinkCard } from "@/components/shared/tu-link-card";
import { inicio, nav } from "@/i18n";
import { formatMoney } from "@/lib/format/money";
import { APP_TZ, toLocalDate } from "@/lib/format/dates";
import { initialsOf } from "@/lib/format/initials";
import { formatPercent } from "@/lib/format/percent";

import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";
import { Avatar } from "@/components/ui/avatar";

import { AgendaToday } from "./agenda-today";
import { AppShell } from "./app-shell";
import { CalendarCard } from "./calendar-card";
import { FlashCard } from "./flash-card";
import { HeroSummary } from "./hero-summary";
import {
  mustParseInstant,
  noShowTrendLabel,
  notificationsLabel,
  todayLabel,
  upcomingToday,
} from "./inicio-view";
import { MainNav } from "./main-nav";
import { StatTile } from "./stat-tile";
import type { InicioData } from "./types";
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
};

const DETAIL_HREF = "#detalle-semana";
const AGENDA_HREF = "/app/agenda";
const FLASH_HREF = "/app/flash";

export function InicioScreen({
  data,
  shellClassName,
  bookingLink,
}: InicioScreenProps) {
  const now = mustParseInstant(data.now, "InicioScreen");
  const bookings = upcomingToday(data.today, now);
  const notificationsCount = data.notifications.count;

  return (
    <AppShell
      rail={<MainNav active="inicio" />}
      mobileTabBar={<OwnerMobileTabBar active="inicio" className="lg:hidden" />}
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
            {/* WP-42: samma avvägning som Hoy (hoy-screen.tsx) — sökknappen ryms inte
                bredvid titel + avisering + avatar på < lg, och sök finns inte på mobil
                någon annanstans i produkten heller. */}
            <IconButton
              label={nav.buscar}
              tone="surface"
              className="hidden lg:inline-flex"
            >
              <Search aria-hidden="true" className="size-5" strokeWidth={1.9} />
            </IconButton>
            <IconButton
              label={notificationsLabel(notificationsCount)}
              tone="surface"
              badge={notificationsCount > 0}
            >
              <Bell aria-hidden="true" className="size-5" strokeWidth={1.9} />
            </IconButton>
            <span className="hidden lg:contents">
              <UserPill
                name={data.owner.name}
                initials={initialsOf(data.owner.name)}
              />
            </span>
            <span aria-hidden="true" className="contents lg:hidden">
              <Avatar
                initials={initialsOf(data.owner.name)}
                tone="lilac"
                size={46}
              />
            </span>
          </>
        }
      />

      <HeroSummary
        ownerFirstName={data.owner.firstName}
        week={data.week}
        features={data.features}
        detailHref={DETAIL_HREF}
      />

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

          <AgendaToday bookings={bookings} href={AGENDA_HREF} />
        </div>

        <aside className="flex w-full flex-col gap-4 lg:w-90 lg:shrink-0 lg:overflow-y-auto">
          <CalendarCard
            month={data.calendar.month}
            today={toLocalDate(now, APP_TZ)}
            markedDates={data.calendar.markedDates}
          />
          <FlashCard activeFlash={data.activeFlash} href={FLASH_HREF} />
          <UpcomingBookingsCard bookings={data.upcoming} href={AGENDA_HREF} />
          {bookingLink ? (
            <TuLinkCard
              slug={bookingLink.slug}
              businessName={bookingLink.businessName}
            />
          ) : null}
        </aside>
      </div>
    </AppShell>
  );
}
