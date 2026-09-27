// Se DESIGN.md §7 "Byggt i WP-12". Visas inte när `waitlist` är null (plan §4 steg 3).
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { roleIcons, strokeCard } from "@/components/ui/icons";
import { formatLocalDate } from "@/lib/format/dates";
import { agenda, estados } from "@/i18n";

import type { AgendaWaitlist } from "./types";

// roleIcons är typad som Record<string, LucideIcon>, så indexeringen ger
// `LucideIcon | undefined` — nyckeln finns garanterat (src/components/ui/icons.ts).
const ListIcon = roleIcons.listaEspera as LucideIcon;

export function WaitlistSummary({ waitlist }: { waitlist: AgendaWaitlist }) {
  if (!waitlist) return null;
  const dia = formatLocalDate(waitlist.day, "weekdayLongLower");
  return (
    <Card
      as="section"
      aria-label={estados.listaDeEspera}
      tone="dark-2"
      radius="card"
      padding="none"
      className="flex items-center gap-3.5 px-5 py-4"
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-avatar bg-peach text-ink">
        <ListIcon
          aria-hidden="true"
          className="size-5.5"
          strokeWidth={strokeCard}
        />
      </div>
      <div className="grow">
        <div className="text-14 font-semibold">
          {agenda.panel.esperanEl({ n: waitlist.count, dia })}
        </div>
        <div className="mt-0.5 text-12 text-on-dark-muted">
          {agenda.panel.avisoWhatsapp}
        </div>
      </div>
    </Card>
  );
}
