// Se docs/design/DESIGN.md §7 "QuickActionTile" (Hoy), rutnätet av tre snabbåtgärder.
import { CreditCard, List, Zap } from "lucide-react";

import { hoy } from "@/i18n";

import { QuickActionTile } from "./quick-action-tile";
import type { HoyLinks } from "./types";

export type QuickActionsProps = {
  links: HoyLinks;
  waitlistCount: number;
};

export function QuickActions({ links, waitlistCount }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      <QuickActionTile
        href={links.flash}
        tone="lime"
        label={hoy.accionesRapidas.crearHoraFlash}
        icon={<Zap aria-hidden="true" className="size-6" strokeWidth={2} />}
      />
      <QuickActionTile
        href={links.waitlist}
        tone="lilac"
        label={hoy.accionesRapidas.listaEspera({ n: waitlistCount })}
        icon={<List aria-hidden="true" className="size-6" strokeWidth={2} />}
      />
      <QuickActionTile
        href={links.cobrar}
        tone="peach"
        label={hoy.accionesRapidas.cobrar}
        icon={
          <CreditCard aria-hidden="true" className="size-6" strokeWidth={2} />
        }
      />
    </div>
  );
}
