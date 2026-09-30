// WP-42: mobilnav delad av ägarens app-skal-skärmar (Inicio, Agenda, Hoy, Ajustes). Ikonen
// för "Hoy" är `Clock` (DESIGN.md §6, "Tid") i stället för `LayoutGrid` (redan Inicios ikon
// här).
//
// WP-24: Clientes och Caja (D-034) återinförs — `canViewReports` döljer Caja för medlemmar
// utan `can_view_reports` (`undefined`/design lab visar den, samma "ingen inskränkning utan
// data"-mönster som `main-nav.tsx`). Sex mål i stället för fyra: `MobileTabBar` räknar
// kolumner från `items.length`.
import {
  BarChart3,
  Calendar,
  Clock,
  LayoutGrid,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import { nav } from "@/i18n";

import { MobileTabBar, type MobileTabItem } from "./mobile-tab-bar";

export type OwnerMobileTab =
  | "inicio"
  | "agenda"
  | "hoy"
  | "clientes"
  | "caja"
  | "ajustes";

const ICON_SIZE = "size-5.5";

const BASE_ITEMS: readonly MobileTabItem[] = [
  {
    key: "inicio",
    href: "/app/inicio",
    label: nav.inicio,
    icon: (
      <LayoutGrid aria-hidden="true" className={ICON_SIZE} strokeWidth={1.9} />
    ),
  },
  {
    key: "agenda",
    href: "/app/agenda",
    label: nav.agenda,
    icon: (
      <Calendar aria-hidden="true" className={ICON_SIZE} strokeWidth={1.9} />
    ),
  },
  {
    key: "hoy",
    href: "/app/hoy",
    label: nav.hoy,
    icon: <Clock aria-hidden="true" className={ICON_SIZE} strokeWidth={1.9} />,
  },
  {
    key: "clientes",
    href: "/app/clientes",
    label: nav.clientes,
    icon: <Users aria-hidden="true" className={ICON_SIZE} strokeWidth={1.9} />,
  },
  {
    key: "caja",
    href: "/app/caja",
    label: nav.caja,
    icon: (
      <BarChart3 aria-hidden="true" className={ICON_SIZE} strokeWidth={1.9} />
    ),
  },
  {
    key: "ajustes",
    href: "/app/ajustes",
    label: nav.ajustes,
    icon: (
      <SlidersHorizontal
        aria-hidden="true"
        className={ICON_SIZE}
        strokeWidth={1.9}
      />
    ),
  },
];

export type OwnerMobileTabBarProps = {
  active: OwnerMobileTab;
  className?: string;
  /** WP-24 (D-034): döljer Caja när medlemmen saknar `can_view_reports`. `undefined`
   * (design lab/ingen medlemsdata) visar den. */
  canViewReports?: boolean;
};

/** `MobileTabBar` (DESIGN.md §7) med ägarskalets mål. Anropas av AppShell/AgendaShell
 * på < lg, `lg:hidden` sätts av anroparen (samma mönster som `rail`/`aside`). */
export function OwnerMobileTabBar({
  active,
  className,
  canViewReports,
}: OwnerMobileTabBarProps) {
  const showCaja = canViewReports ?? true;
  const items = BASE_ITEMS.filter((i) => i.key !== "caja" || showCaja);
  return <MobileTabBar items={items} active={active} className={className} />;
}
