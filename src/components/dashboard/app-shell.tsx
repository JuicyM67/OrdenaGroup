// Se DESIGN.md §7 "AppShell (desktop)" och docs/tasks/plans/WP-11.md §4 steg 3. Generell
// ram för ägarens desktop-sidor (Inicio, Clientes, Horas flash, Caja, Ajustes) — Agenda
// använder en annan ram/rail (WP-12). `h-dvh` som standard; i design lab ersätts den med
// artboardens fasta höjd via `className` (samma höjdklassgrupp, tailwind-merge väljer den
// sista, se cn.ts).
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

export type AppShellProps = {
  rail: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AppShell({ rail, children, className }: AppShellProps) {
  return (
    <div className={cn("flex h-dvh gap-4 bg-ink p-4", className)}>
      {rail}
      <main className="flex flex-1 flex-col gap-6 overflow-hidden rounded-shell bg-canvas px-8 py-7">
        {children}
      </main>
    </div>
  );
}
