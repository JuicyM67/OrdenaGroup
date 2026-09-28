// Se DESIGN.md §7 "NavRail" och docs/tasks/plans/WP-11.md §4 steg 3. `NavRail
// variant="bare"` med logga (dekorativ, ingen href ännu — se scope), sex huvudlänkar och
// "Cerrar sesión" sist. Länkarna till sidor som inte finns än (Clientes, Horas flash, Caja,
// Ajustes) ger 404 tills respektive WP är klart (§2 i planen); "Cerrar sesión" är en
// platshållare till WP-15. Ikonerna importeras direkt (som i design-lab/crops
// MainNavRailCrop, WP-02) i stället för att indexera `roleIcons` med en variabel nyckel,
// eftersom `noUncheckedIndexedAccess` annars gör resultatet `LucideIcon | undefined`.
import {
  BarChart3,
  Calendar,
  LayoutGrid,
  LogOut,
  SlidersHorizontal,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { strokeNav } from "@/components/ui/icons";
import {
  NavRail,
  NavRailLink,
  NavRailLogo,
  NavRailSpacer,
} from "@/components/ui/nav-rail";
import { nav } from "@/i18n";

export type MainNavKey =
  "inicio" | "agenda" | "clientes" | "horasFlash" | "caja" | "ajustes";

export const DEFAULT_MAIN_NAV_HREFS: Record<MainNavKey, string> = {
  inicio: "/app/inicio",
  agenda: "/app/agenda",
  clientes: "/app/clientes",
  horasFlash: "/app/flash",
  caja: "/app/caja",
  ajustes: "/app/ajustes",
};

const ITEMS: { key: MainNavKey; label: string; icon: LucideIcon }[] = [
  { key: "inicio", label: nav.inicio, icon: LayoutGrid },
  { key: "agenda", label: nav.agenda, icon: Calendar },
  { key: "clientes", label: nav.clientes, icon: Users },
  { key: "horasFlash", label: nav.horasFlash, icon: Zap },
  { key: "caja", label: nav.cajaEInformes, icon: BarChart3 },
  { key: "ajustes", label: nav.ajustes, icon: SlidersHorizontal },
];

export type MainNavProps = {
  active: MainNavKey;
  hrefs?: Record<MainNavKey, string>;
};

export function MainNav({
  active,
  hrefs = DEFAULT_MAIN_NAV_HREFS,
}: MainNavProps) {
  return (
    <NavRail variant="bare" aria-label={nav.principal}>
      <NavRailLogo label={nav.volverAlInicio} />
      {ITEMS.map(({ key, label, icon: Icon }) => (
        <NavRailLink
          key={key}
          href={hrefs[key]}
          label={label}
          active={active === key}
          prefetch={false}
          icon={
            <Icon
              aria-hidden="true"
              className="size-5.5"
              strokeWidth={strokeNav}
            />
          }
        />
      ))}
      <NavRailSpacer />
      <NavRailLink
        href="#cerrar-sesion"
        label={nav.cerrarSesion}
        prefetch={false}
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
