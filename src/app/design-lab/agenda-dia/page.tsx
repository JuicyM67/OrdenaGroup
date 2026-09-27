// Se docs/tasks/plans/WP-12.md steg 7/8. Dagvyn saknar en ritad referens (härledd, se
// DESIGN.md §7 "Byggt i WP-12") — verifieras med stilparitet mot /design-lab/agenda och
// delregioner mot Agenda.png (scripts/visual-diff.mjs). 1440×900, fredag 2 oktober, alla tre
// profesionales, samma `now`, ingen öppen popover.
import { AgendaScreen } from "@/components/agenda/agenda-screen";
import type { LocalDate } from "@/lib/format/dates";

import { agendaFixture } from "../agenda/fixtures";

export default function AgendaDiaDesignLabPage() {
  return (
    <div className="h-225 w-360">
      <AgendaScreen
        data={agendaFixture}
        initialVista="dia"
        initialFecha={"2026-10-02" as LocalDate}
        className="h-full"
        autoScrollToNow={false}
      />
    </div>
  );
}
