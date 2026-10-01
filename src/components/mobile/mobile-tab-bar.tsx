// Se docs/design/DESIGN.md §7 "MobileTabBar". Generell för ägarens mobilvyer (props: items,
// active) — Hoy är den första som använder den (WP-14), Agenda/Clientes/Caja återanvänder den.
//
// WP-57 (punkt 3): `item` är antingen en länk (`href`) eller en knapp (`onClick`, t.ex.
// "Mer" som öppnar ett bottenark i stället för att navigera, se owner-tab-bar.tsx).
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import { nav } from "@/i18n";

export type MobileTabItem = {
  key: string;
  label: string;
  icon: ReactNode;
} & (
  | { href: string; onClick?: undefined }
  | { href?: undefined; onClick: () => void }
);

export type MobileTabBarProps = {
  items: readonly MobileTabItem[];
  /** `key` för den aktiva fliken. */
  active: string;
  /** WP-42: `lg:hidden` från AppShell/AgendaShell (ägarskalets skärmar döljer flikraden på
   * skrivbordet). Hoy (mobil-only route) skickar ingen. */
  className?: string;
};

// WP-24: antal flikar varierar nu per skärm (Hoy/Agenda/Clientes/Caja = 4, den delade
// `OwnerMobileTabBar` upp till 6 med Inicio/Ajustes också) — en uppslagstabell med
// bokstavliga Tailwind-klasser (inte `grid-cols-${n}`) så Tailwinds JIT hittar dem.
const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

export function MobileTabBar({ items, active, className }: MobileTabBarProps) {
  return (
    <nav
      aria-label={nav.secciones}
      data-surface="dark"
      className={cn(
        // WP-42: `bottom-safe-b` (i stället för `bottom-4`) håller samma 16 px-marginal och
        // lägger till `env(safe-area-inset-bottom)` ovanpå — se DESIGN.md §5.
        "fixed inset-x-4 bottom-safe-b mx-auto grid h-18 max-w-112 items-center rounded-bar bg-dark px-2",
        GRID_COLS[items.length] ?? "grid-cols-4",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.key === active;
        const itemClassName = cn(
          "flex h-full flex-col items-center justify-center gap-1 transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:transition-none on-dark:focus-visible:outline-lime",
          isActive ? "text-lime" : "text-on-dark-muted",
        );
        const content = (
          <>
            {item.icon}
            <span
              className={cn(
                "text-11",
                isActive ? "font-bold" : "font-semibold",
              )}
            >
              {item.label}
            </span>
          </>
        );
        if (item.href) {
          return (
            <Link
              key={item.key}
              href={item.href}
              // Agenda/Clientes/Caja byggs i senare WP — utan detta prefetchar Next.js
              // routerna på varje sidladdning (RSC-fetchar som aldrig blir klara mot en
              // route som inte finns, vilket bl.a. gör npm run visual (networkidle)
              // odeterministiskt).
              prefetch={false}
              aria-current={isActive ? "page" : undefined}
              className={itemClassName}
            >
              {content}
            </Link>
          );
        }
        // WP-57: "Mer" — öppnar ett bottenark i stället för att navigera.
        return (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            aria-current={isActive ? "page" : undefined}
            className={itemClassName}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}
