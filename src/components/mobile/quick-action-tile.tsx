// Se docs/design/DESIGN.md §7 "QuickActionTile" (Hoy) och "Medveten avvikelse (WP-57)".
// Raden självt byggs av quick-actions.tsx, som skickar in ikon och ton per ruta.
//
// WP-57 (punkt 5, UX-genomgång "Snabbknapparna har samma vikt som nästa kund"): 52 px hög
// i stället för 96 — ikon och etikett sida vid sida i stället för ikon överst/etikett
// nederst, så de tre knapparna väger mindre än `NextClientCard` ovanför.
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
        "flex h-13 items-center gap-2 rounded-tile px-3 text-ink transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none",
        toneClass[tone],
      )}
    >
      {icon}
      <span className="min-w-0 truncate text-13 leading-snug font-bold">
        {label}
      </span>
    </Link>
  );
}
