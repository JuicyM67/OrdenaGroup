// Se DESIGN.md §7 "Byggt i WP-12" och docs/design/reference/Agenda.dc.html <nav>.
//
// WP-47: "+ Nueva reserva" öppnar den riktiga dialogen (`onNewBooking`, samma som
// toolbar/MobileDayNav i agenda-screen.tsx) i stället för att vara ett no-op. "+ Agregar
// profesional" länkar till /app/ajustes#equipo (personalsektionen finns redan där). Ajustes
// och "Cerrar sesión" läggs till längst ned, samma mönster som main-nav.tsx. WP-24: Clientes
// och Caja (samma D-034-spärr på Caja som main-nav.tsx) läggs till strax ovanför Ajustes —
// referensen (Agenda.dc.html) saknar dem helt i den här panelen (bara logga/+ny/personal),
// men utan en egen väg dit skulle de vara onåbara från Agenda-skärmen på skrivbordet.
import {
  BarChart3,
  LogOut,
  Plus,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import Link from "next/link";

import {
  NavRail,
  NavRailAction,
  NavRailDivider,
  NavRailFormAction,
  NavRailLink,
  NavRailLogo,
  NavRailSpacer,
} from "@/components/ui/nav-rail";
import { strokeArrow, strokeNav } from "@/components/ui/icons";
import { agenda, nav } from "@/i18n";

import { strokeNuevaReserva } from "./icons";
import { StaffRailButton } from "./staff-rail-button";
import type { AgendaStaff, StaffId } from "./types";

export type AgendaRailProps = {
  staff: readonly AgendaStaff[];
  /** Ringmarkerad profesional (FRÅGA 5), inte samma sak som sidopanelens filter. */
  highlightedStaffId: StaffId | null;
  onSelectStaff: (id: StaffId) => void;
  /** WP-47: öppnar `ManualBookingDialog`. `undefined` (design lab) → knappen är kvar men
   * gör inget (samma som tidigare). */
  onNewBooking?: () => void;
  /** WP-47: `logout` (server action). `undefined` i design lab. */
  onLogout?: () => void | Promise<void>;
  /** WP-24 (D-034): döljer länken till Caja när medlemmen saknar `can_view_reports`.
   * `undefined` (design lab/ingen medlemsdata) visar den. */
  canViewReports?: boolean;
};

export function AgendaRail({
  staff,
  highlightedStaffId,
  onSelectStaff,
  onNewBooking,
  onLogout,
  canViewReports,
}: AgendaRailProps) {
  const showCaja = canViewReports ?? true;
  return (
    <NavRail variant="panel" aria-label={nav.principal}>
      <NavRailLogo href="/app/inicio" label={nav.volverAlInicio} />
      <NavRailAction
        shape="square"
        label={agenda.nuevaReserva}
        onClick={onNewBooking}
      >
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
      <NavRailAction label={agenda.agregarProfesional} asChild>
        <Link href="/app/ajustes#equipo" prefetch={false}>
          <Plus
            aria-hidden="true"
            className="size-5"
            strokeWidth={strokeArrow}
          />
        </Link>
      </NavRailAction>
      <NavRailSpacer />
      <NavRailLink
        href="/app/clientes"
        label={nav.clientes}
        prefetch={false}
        icon={
          <Users
            aria-hidden="true"
            className="size-5.5"
            strokeWidth={strokeNav}
          />
        }
      />
      {showCaja ? (
        <NavRailLink
          href="/app/caja"
          label={nav.caja}
          prefetch={false}
          icon={
            <BarChart3
              aria-hidden="true"
              className="size-5.5"
              strokeWidth={strokeNav}
            />
          }
        />
      ) : null}
      <NavRailLink
        href="/app/ajustes"
        label={nav.ajustes}
        prefetch={false}
        icon={
          <SlidersHorizontal
            aria-hidden="true"
            className="size-5.5"
            strokeWidth={strokeNav}
          />
        }
      />
      <NavRailFormAction
        action={onLogout ?? (() => {})}
        label={nav.cerrarSesion}
        icon={
          <LogOut
            aria-hidden="true"
            className="size-5.5"
            strokeWidth={strokeNav}
          />
        }
      />
    </NavRail>
  );
}
