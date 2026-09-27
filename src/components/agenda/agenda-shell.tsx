// Se DESIGN.md §7 "Byggt i WP-12" och docs/design/reference/Agenda.dc.html (yttre <div>).
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

export type AgendaShellProps = {
  rail: ReactNode;
  aside: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AgendaShell({
  rail,
  aside,
  children,
  className,
}: AgendaShellProps) {
  return (
    <div className={cn("flex h-dvh gap-4 bg-night p-4", className)}>
      {rail}
      <aside className="flex w-75 shrink-0 flex-col gap-3">{aside}</aside>
      <main className="flex min-w-0 flex-1 flex-col rounded-hero bg-agenda p-5">
        {children}
      </main>
    </div>
  );
}
