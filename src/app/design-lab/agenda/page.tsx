// Se docs/tasks/plans/WP-12.md steg 8. Artboard 1440×900 (h-225 w-360), utan extra marginal
// (WP-02 steg 1). `?estado=` väljer tillstånd, standard = referensens läge (Martina Lagos
// popover öppen).
import { AgendaScreen } from "@/components/agenda/agenda-screen";
import type { AgendaData } from "@/components/agenda/types";
import type { LocalDate } from "@/lib/format/dates";

import {
  agendaFixture,
  agendaFixtureBlockedStaff,
  agendaFixtureClosedToday,
  agendaFixtureEmpty,
  agendaFixtureOverlap,
} from "./fixtures";

const ESTADOS: Record<string, AgendaData> = {
  vacia: agendaFixtureEmpty,
  cerrado: agendaFixtureClosedToday,
  solapadas: agendaFixtureOverlap,
  bloqueo: agendaFixtureBlockedStaff,
};

export default async function AgendaDesignLabPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const data = (estado && ESTADOS[estado]) || agendaFixture;
  const showPopover = !estado;

  return (
    <div className="h-225 w-360">
      <AgendaScreen
        data={data}
        initialVista="semana"
        initialFecha={"2026-10-02" as LocalDate}
        initialSelectedBookingId={showPopover ? "bk-vie-2" : undefined}
        className="h-full"
        autoScrollToNow={false}
      />
    </div>
  );
}
