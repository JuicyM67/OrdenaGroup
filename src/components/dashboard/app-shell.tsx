// Se DESIGN.md §7 "AppShell (desktop)"/"AppShell (mobil)" och docs/tasks/plans/WP-11.md §4
// steg 3. Generell ram för ägarens sidor (Inicio, Clientes, Horas flash, Caja, Ajustes) —
// Agenda använder en annan ram/rail (WP-12, `agenda-shell.tsx`, samma mobilmönster). `h-dvh`
// som standard på skrivbordet (`lg:`); i design lab ersätts den med artboardens fasta höjd
// via `className` (samma höjdklassgrupp, tailwind-merge väljer den sista, se cn.ts) — design
// lab renderas alltid ≥ `lg` bred (1440 px, `npm run visual`), så mobilklasserna nedan
// påverkar aldrig skärmdumparna.
//
// WP-42: under `lg` döljs `rail` helt (sidomenyn tar annars hela bredden) och ersätts av
// `OwnerMobileTopBar` (logga + "Cerrar sesión", delad med `agenda-shell.tsx`) och
// `mobileTabBar` (fast i botten, se `owner-tab-bar.tsx`). `main` tappar den mörka ramens
// padding/radie på mobil (canvas fyller hela bredden, ingen `overflow-hidden` — sidan får
// skrolla normalt i stället för att klippa innehåll).
import type { ReactNode } from "react";

import { OwnerMobileTopBar } from "@/components/mobile/owner-top-bar";
import { cn } from "@/components/ui/cn";

export type AppShellProps = {
  rail: ReactNode;
  children: ReactNode;
  /** `<OwnerMobileTabBar active="…" />` — döljs automatiskt på skrivbordet av anroparen
   * (samma mönster som `rail`). Valfri: design lab skickar ingen. */
  mobileTabBar?: ReactNode;
  className?: string;
};

export function AppShell({
  rail,
  children,
  mobileTabBar,
  className,
}: AppShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col bg-canvas lg:h-dvh lg:flex-row lg:gap-4 lg:bg-ink lg:p-4",
        className,
      )}
    >
      <div className="hidden lg:contents">{rail}</div>
      <OwnerMobileTopBar />
      <main className="flex flex-1 flex-col gap-6 px-5 py-5 pb-28 lg:overflow-hidden lg:rounded-shell lg:bg-canvas lg:px-8 lg:py-7 lg:pb-7">
        {children}
      </main>
      {mobileTabBar}
    </div>
  );
}
