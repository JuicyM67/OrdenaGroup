// Se docs/design/DESIGN.md §7 "QuickActionTile" (Hoy). Rutnätet självt (3 kolumner) byggs
// av quick-actions.tsx, som skickar in ikon och ton per ruta.
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

export type QuickActionTone = "lime" | "lilac" | "peach";

const toneClass: Record<QuickActionTone, string> = {
  lime: "bg-lime",
  lilac: "bg-lilac",
  peach: "bg-peach",
};

export type QuickActionTileProps = {
  href: string;
  label: string;
  icon: ReactNode;
  tone: QuickActionTone;
};

export function QuickActionTile({
  href,
  label,
  icon,
  tone,
}: QuickActionTileProps) {
  return (
    <Link
      href={href}
      // Målen (hora flash, lista de espera, cobrar) byggs i andra WP — se motiveringen i
      // mobile-tab-bar.tsx.
      prefetch={false}
      className={cn(
        "flex h-24 flex-col justify-between rounded-tile p-3.5 text-ink transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none",
        toneClass[tone],
      )}
    >
      {icon}
      <span className="text-14 leading-snug font-bold">{label}</span>
    </Link>
  );
}
