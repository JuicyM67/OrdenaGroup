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
  agendaFixtureRequested,
} from "./fixtures";

const ESTADOS: Record<string, AgendaData> = {
  vacia: agendaFixtureEmpty,
  cerrado: agendaFixtureClosedToday,
  solapadas: agendaFixtureOverlap,
  bloqueo: agendaFixtureBlockedStaff,
  solicitudes: agendaFixtureRequested,
};

// WP-45 (D-033): demo för `?estado=solicitudes` (skärmdump, FRÅGA 5) — ingen server bakom
// design lab, "Confirmar"/"Rechazar" svarar alltid ok utan att ändra fixturen.
async function demoOk() {
  "use server";
  return { ok: true };
}

export default async function AgendaDesignLabPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const data = (estado && ESTADOS[estado]) || agendaFixture;
  const showPopover = !estado;
  const showRequests = estado === "solicitudes";

  return (
    <div className="h-225 w-360">
      <AgendaScreen
        data={data}
        initialVista="semana"
        initialFecha={"2026-10-02" as LocalDate}
        initialSelectedBookingId={
          showPopover
            ? "bk-vie-2"
            : showRequests
              ? "bk-vie-solicitud"
              : undefined
        }
        className="h-full"
        autoScrollToNow={false}
        onConfirmRequest={showRequests ? demoOk : undefined}
        onDeclineRequest={showRequests ? demoOk : undefined}
      />
    </div>
  );
}
