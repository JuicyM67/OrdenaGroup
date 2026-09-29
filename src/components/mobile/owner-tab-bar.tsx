// WP-42: mobilnav delad av ägarens app-skal-skärmar (Inicio, Agenda, Ajustes) som INTE är
// Hoy — Hoy har sin egen flikrad (hoy-screen.tsx, WP-14, fyra andra mål). Bara de fyra
// rutter som faktiskt finns byggda (`docs/tasks/BACKLOG.md`): Inicio/Agenda/Hoy/Ajustes —
// Clientes/Horas flash/Caja finns bara i skrivbordets MainNav (WP-11) och länkar dit 404:ar
// fortfarande (WP-42-planen listar bara dessa fyra). Ikonen för "Hoy" är `Clock` (DESIGN.md
// §6, "Tid") i stället för `LayoutGrid` (redan Inicios ikon här) — Hoys egen flikrad
// återanvänder `LayoutGrid` för "hoy" men den bar har inget "Inicio"-mål att krocka med.
import { Calendar, Clock, LayoutGrid, SlidersHorizontal } from "lucide-react";

import { nav } from "@/i18n";

import { MobileTabBar, type MobileTabItem } from "./mobile-tab-bar";

export type OwnerMobileTab = "inicio" | "agenda" | "hoy" | "ajustes";

const ICON_SIZE = "size-5.5";

const ITEMS: readonly MobileTabItem[] = [
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
};

/** `MobileTabBar` (DESIGN.md §7) med ägarskalets fyra mål. Anropas av AppShell/AgendaShell
 * på < lg, `lg:hidden` sätts av anroparen (samma mönster som `rail`/`aside`). */
export function OwnerMobileTabBar({
  active,
  className,
}: OwnerMobileTabBarProps) {
  return <MobileTabBar items={ITEMS} active={active} className={className} />;
}
