"use client";

// WP-42: mobilnav delad av ägarens app-skal-skärmar (Inicio, Agenda, Hoy, Clientes, Caja,
// Ajustes …). Ikonen för "Hoy" är `Clock` (DESIGN.md §6, "Tid") i stället för `LayoutGrid`
// (redan Inicios ikon här).
//
// WP-57 (punkt 3, UX-genomgång "Mobilens flikrad"): fem mål i stället för sex —
// Inicio/Agenda/Hoy/Clientes är kvar som riktiga länkar, "Mer" (sista platsen) öppnar ett
// bottenark (`MoreSheet`, more-sheet.tsx) med Blixttider, Caja (behörighet), Utskick,
// Inställningar och "Cerrar sesión" i stället för att trängas i flikraden på 360 px. `active`
// behåller alla gamla värden ("caja"/"ajustes" m.fl., se `MER_ACTIVE_KEYS` nedan) så
// anropande skärmar (Caja/Ajustes/Clientes/Campañas/Agenda/Flash) inte behöver ändras —
// "Mer" tänds i stället lime när den aktiva skärmen är en av dem som nu bor i bottenarket.
// "use client": lokalt öppet/stängt-läge för bottenarket.
import {
  Calendar,
  Clock,
  LayoutGrid,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { useOptionalOwnerChrome } from "@/components/shared/owner-chrome";
import { useState } from "react";

import { nav } from "@/i18n";

import { MobileTabBar, type MobileTabItem } from "./mobile-tab-bar";
import { MoreSheet } from "./more-sheet";

export type OwnerMobileTab =
  | "inicio"
  | "agenda"
  | "hoy"
  | "clientes"
  | "caja"
  | "ajustes"
  | "flash"
  | "campanas";

const ICON_SIZE = "size-5.5";

/** Skärmar som nu bor i "Mer"-bottenarket i stället för en egen flik. */
const MER_ACTIVE_KEYS: ReadonlySet<OwnerMobileTab> = new Set([
  "caja",
  "ajustes",
  "flash",
  "campanas",
]);

const PRIMARY_ITEMS: readonly MobileTabItem[] = [
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
];

export type OwnerMobileTabBarProps = {
  active: OwnerMobileTab;
  className?: string;
  /** WP-24 (D-034): döljer Caja (i "Mer") när medlemmen saknar `can_view_reports`.
   * `undefined` (design lab/ingen medlemsdata) visar den. */
  canViewReports?: boolean;
  /** WP-57: "Cerrar sesión" i "Mer"-arket. `undefined` → raden finns kvar men gör inget,
   * se `MoreSheet`. */
  onLogout?: () => void | Promise<void>;
};

/** `MobileTabBar` (DESIGN.md §7) med ägarskalets mål. Anropas av AppShell/AgendaShell
 * på < lg, `lg:hidden` sätts av anroparen (samma mönster som `rail`/`aside`). */
export function OwnerMobileTabBar({
  active,
  className,
  canViewReports,
  onLogout,
}: OwnerMobileTabBarProps) {
  const chrome = useOptionalOwnerChrome();
  const logout = onLogout ?? chrome?.onLogout;
  const showCaja = canViewReports ?? chrome?.canViewReports ?? true;
  const [moreOpen, setMoreOpen] = useState(false);
  const merActive = MER_ACTIVE_KEYS.has(active);
  const items: MobileTabItem[] = [
    ...PRIMARY_ITEMS,
    {
      key: "mer",
      label: nav.masOpciones,
      icon: (
        <MoreHorizontal
          aria-hidden="true"
          className={ICON_SIZE}
          strokeWidth={1.9}
        />
      ),
      onClick: () => setMoreOpen(true),
    },
  ];
  return (
    <>
      <MobileTabBar
        items={items}
        active={merActive ? "mer" : active}
        className={className}
      />
      <MoreSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        showCaja={showCaja}
        onLogout={logout}
      />
    </>
  );
}
