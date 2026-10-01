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

// WP-61: klockan (AgendaToolbar) kräver både onConfirmRequest OCH onDeclineRequest för att
// visas alls (samma regel som Inicio/Hoy) — unikt från `showRequests` ovan: klockan ska
// synas i ALLA lägen (precis som i den riktiga appen), inte bara `?estado=solicitudes`-demon.
// "Nueva reserva" (samma knapp): `onCreateManualBooking` saknades tidigare helt i design lab,
// vilket (ofarligt innan WP-61) gjorde knappen osynlig i skärmdumpen — syns nu i referensbilden
// (`docs/design/screens/Agenda.png`), så den måste finnas här för att matcha.
async function demoCreateBooking() {
  "use server";
  return { ok: true as const };
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
        onConfirmRequest={demoOk}
        onDeclineRequest={demoOk}
        onCreateManualBooking={demoCreateBooking}
        // WP-61: samma persona som övriga design lab-fixturer (design-lab/main/fixtures.ts)
        // — ett tomt namn gör UserPill-knappen (AgendaToolbar) namnlös för skärmläsare
        // (axe: "Element does not have inner text …").
        ownerName="Camila R."
        publicPageHref="/barberia-norte"
      />
    </div>
  );
}
