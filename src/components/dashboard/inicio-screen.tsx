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
import { formatClp } from "@/lib/format/clp";
import { SANTIAGO, toLocalDate } from "@/lib/format/dates";
import { initialsOf } from "@/lib/format/initials";
import { formatPercent } from "@/lib/format/percent";

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
    <AppShell rail={<MainNav active="inicio" />} className={shellClassName}>
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
            <IconButton label={nav.buscar} tone="surface">
              <Search aria-hidden="true" className="size-5" strokeWidth={1.9} />
            </IconButton>
            <IconButton
              label={notificationsLabel(notificationsCount)}
              tone="surface"
              badge={notificationsCount > 0}
            >
              <Bell aria-hidden="true" className="size-5" strokeWidth={1.9} />
            </IconButton>
            <UserPill
              name={data.owner.name}
              initials={initialsOf(data.owner.name)}
            />
          </>
        }
      />

      <HeroSummary
        ownerFirstName={data.owner.firstName}
        week={data.week}
        features={data.features}
        detailHref={DETAIL_HREF}
      />

      <div className="flex min-h-0 flex-1 gap-6">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5">
          <div className="grid grid-cols-3 gap-4">
            <StatTile
              variant="number"
              value={data.stats.bookingsToday}
              meta={inicio.stats.reservasHoy({ n: data.stats.toConfirm })}
            />
            <StatTile
              variant="amount"
              value={formatClp(data.stats.revenueWeekClp)}
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

        <aside className="flex w-90 shrink-0 flex-col gap-4 overflow-y-auto">
          <CalendarCard
            month={data.calendar.month}
            today={toLocalDate(now, SANTIAGO)}
            markedDates={data.calendar.markedDates}
          />
          <FlashCard activeFlash={data.activeFlash} href={FLASH_HREF} />
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
