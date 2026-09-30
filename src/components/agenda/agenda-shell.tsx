// Se DESIGN.md §7 "AppShell (mobil)" och docs/design/reference/Agenda.dc.html (yttre <div>).
//
// WP-42: under `lg` döljs `rail` (profesional-remsan) och `aside` (månadskalender,
// personalfilter, teckenförklaring, väntelista) helt — de ryms inte och har redan en
// mobilväg (staff-växlaren i `agenda-screen.tsx`s mobila dagvy respektive
// `waitlist-summary`/filter som bara är skrivbordsgenvägar). `OwnerMobileTopBar` (delad med
// `app-shell.tsx`) ersätter dem, `mobileTabBar` läggs fast i botten av anroparen.
import type { ReactNode } from "react";

import { OwnerMobileTopBar } from "@/components/mobile/owner-top-bar";
import { cn } from "@/components/ui/cn";

export type AgendaShellProps = {
  rail: ReactNode;
  aside: ReactNode;
  children: ReactNode;
  /** `<OwnerMobileTabBar active="agenda" className="lg:hidden" />`. Valfri: design lab
   * skickar ingen. */
  mobileTabBar?: ReactNode;
  /** WP-47: `logout` (server action), vidarebefordras till `OwnerMobileTopBar`. */
  onLogout?: () => void | Promise<void>;
  className?: string;
};

export function AgendaShell({
  rail,
  aside,
  children,
  mobileTabBar,
  onLogout,
  className,
}: AgendaShellProps) {
  return (
    <div
      className={cn(
        "flex h-dvh flex-col bg-night lg:flex-row lg:gap-4 lg:p-4",
        className,
      )}
    >
      <div className="hidden lg:contents">{rail}</div>
      <OwnerMobileTopBar onLogout={onLogout} />
      <div className="hidden lg:flex lg:w-75 lg:shrink-0 lg:flex-col lg:gap-3">
        {aside}
      </div>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-agenda p-4 pb-28 lg:rounded-hero lg:p-5 lg:pb-5">
        {children}
      </main>
      {mobileTabBar}
    </div>
  );
}
