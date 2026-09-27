// Se docs/design/DESIGN.md §7 "MobileTabBar". Generell för ägarens mobilvyer (props: items,
// active) — Hoy är den första som använder den (WP-14), Agenda/Clientes/Caja återanvänder den.
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import { nav } from "@/i18n/es-CL";

export type MobileTabItem = {
  key: string;
  href: string;
  label: string;
  icon: ReactNode;
};

export type MobileTabBarProps = {
  items: readonly MobileTabItem[];
  /** `key` för den aktiva fliken. */
  active: string;
};

export function MobileTabBar({ items, active }: MobileTabBarProps) {
  return (
    <nav
      aria-label={nav.secciones}
      data-surface="dark"
      className="fixed inset-x-4 bottom-4 mx-auto grid h-18 max-w-112 grid-cols-4 items-center rounded-bar bg-dark px-2"
    >
      {items.map((item) => {
        const isActive = item.key === active;
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
            className={cn(
              "flex h-full flex-col items-center justify-center gap-1 transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:transition-none on-dark:focus-visible:outline-lime",
              isActive ? "text-lime" : "text-on-dark-muted",
            )}
          >
            {item.icon}
            <span
              className={cn(
                "text-11",
                isActive ? "font-bold" : "font-semibold",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
