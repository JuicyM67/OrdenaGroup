// Se DESIGN.md §7 "Byggt i WP-12" och docs/design/reference/Agenda.dc.html <nav>.
import { Plus } from "lucide-react";

import {
  NavRail,
  NavRailAction,
  NavRailDivider,
  NavRailLogo,
} from "@/components/ui/nav-rail";
import { strokeArrow } from "@/components/ui/icons";
import { agenda, nav } from "@/i18n";

import { strokeNuevaReserva } from "./icons";
import { StaffRailButton } from "./staff-rail-button";
import type { AgendaStaff, StaffId } from "./types";

export type AgendaRailProps = {
  staff: readonly AgendaStaff[];
  /** Ringmarkerad profesional (FRÅGA 5), inte samma sak som sidopanelens filter. */
  highlightedStaffId: StaffId | null;
  onSelectStaff: (id: StaffId) => void;
};

export function AgendaRail({
  staff,
  highlightedStaffId,
  onSelectStaff,
}: AgendaRailProps) {
  return (
    <NavRail variant="panel" aria-label={nav.principal}>
      <NavRailLogo href="/app/inicio" label={nav.volverAlInicio} />
      <NavRailAction shape="square" label={agenda.nuevaReserva}>
        <Plus
          aria-hidden="true"
          className="size-5.5"
          strokeWidth={strokeNuevaReserva}
        />
      </NavRailAction>
      <NavRailDivider />
      {staff.map((s) => (
        <StaffRailButton
          key={s.id}
          staff={s}
          selected={s.id === highlightedStaffId}
          onSelect={() => onSelectStaff(s.id)}
        />
      ))}
      <NavRailAction label={agenda.agregarProfesional}>
        <Plus aria-hidden="true" className="size-5" strokeWidth={strokeArrow} />
      </NavRailAction>
    </NavRail>
  );
}
