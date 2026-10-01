// Se DESIGN.md §7 "NavRail" och docs/tasks/plans/WP-11.md §4 steg 3. `NavRail
// variant="bare"` med logga, sex huvudlänkar och "Cerrar sesión" sist.
//
// WP-47: Clientes/Horas flash/Caja döljdes (ingen route/backend fanns, ledde till 404) —
// WP-24 återinförde Clientes och Caja; WP-23/WP-30 återinför Horas flash (route/backend
// finns nu). `canViewReports` (WP-24, D-034): Caja kräver `can_view_reports`
// (eller ägare) — annars skulle länken leda till en redirect till /app/agenda. `undefined`
// (design lab, ingen medlemsdata) visar Caja, samma "ingen inskränkning utan data"-mönster
// som `showReports` i `src/server/owner/inicio.ts`. Loggan länkar till /app/inicio
// (tidigare dekorativ utan href) och "Cerrar sesión" är en riktig `<form action={onLogout}>`
// (WP-15, `src/app/auth/actions.ts`), inte längre en platshållarlänk. `onLogout` tas emot
// som prop (inte importerad direkt): `logout()` importerar `server-only` transitivt
// (`@/lib/supabase/server`), och den här filen renderas av `main-nav.test.tsx` i Vitests
// "dom"-projekt, som inte aliasar bort `server-only` (bara "node"-projektet gör det, se
// vitest.config.mts) — samma mönster som `onArrival`/`onMoveBooking` i agenda-screen.tsx.
// Ikonerna importeras direkt (som i design-lab/crops MainNavRailCrop, WP-02) i stället för
// att indexera `roleIcons` med en variabel nyckel, eftersom `noUncheckedIndexedAccess`
// annars gör resultatet `LucideIcon | undefined`.
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
  NavRailFormAction,
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

/** WP-23/WP-30: Horas flash återinförd (route/backend finns nu). Caja filtreras
 * dessutom av `canViewReports` (se nedan). */
const VISIBLE_KEYS: readonly MainNavKey[] = [
  "inicio",
  "agenda",
  "clientes",
  "horasFlash",
  "caja",
  "ajustes",
];

const ITEMS: { key: MainNavKey; label: string; icon: LucideIcon }[] = [
  { key: "inicio", label: nav.inicio, icon: LayoutGrid },
  { key: "agenda", label: nav.agenda, icon: Calendar },
  { key: "clientes", label: nav.clientes, icon: Users },
  { key: "horasFlash", label: nav.horasFlash, icon: Zap },
  { key: "caja", label: nav.caja, icon: BarChart3 },
  { key: "ajustes", label: nav.ajustes, icon: SlidersHorizontal },
];

export type MainNavProps = {
  active: MainNavKey;
  hrefs?: Record<MainNavKey, string>;
  /** WP-24 (D-034): döljer länken till Caja när medlemmen saknar `can_view_reports`.
   * `undefined` (design lab/ingen medlemsdata) visar den. */
  canViewReports?: boolean;
  /** `logout` (server action), bunden av anroparens `page.tsx`. `undefined` i design lab. */
  onLogout?: () => void | Promise<void>;
};

export function MainNav({
  active,
  hrefs = DEFAULT_MAIN_NAV_HREFS,
  canViewReports,
  onLogout,
}: MainNavProps) {
  const showCaja = canViewReports ?? true;
  return (
    <NavRail variant="bare" aria-label={nav.principal}>
      <NavRailLogo href="/app/inicio" label={nav.volverAlInicio} />
      {ITEMS.filter(
        ({ key }) => VISIBLE_KEYS.includes(key) && (key !== "caja" || showCaja),
      ).map(({ key, label, icon: Icon }) => (
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
