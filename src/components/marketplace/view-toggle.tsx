// Lista/Karta-växeln (WP-68): två länkar i en segmentpill.
import { List, Map } from "lucide-react";
import Link from "next/link";

import { cn } from "@/components/ui/cn";
import { descubre } from "@/i18n";

const t = descubre;

const item =
  "flex h-9 items-center gap-1.5 rounded-event px-3.5 text-13 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function ViewToggle({
  active,
  listHref,
  mapHref,
  className,
}: {
  active: "lista" | "karta";
  listHref: string;
  mapHref: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={t.nav.vistas}
      className={cn("flex gap-1 rounded-control bg-surface p-1", className)}
    >
      <Link
        href={listHref}
        aria-current={active === "lista" ? "page" : undefined}
        className={cn(
          item,
          active === "lista" ? "bg-ink text-on-dark" : "hover:bg-ink/5",
        )}
      >
        <List aria-hidden="true" className="size-4" strokeWidth={2} />
        {t.nav.lista}
      </Link>
      <Link
        href={mapHref}
        aria-current={active === "karta" ? "page" : undefined}
        className={cn(
          item,
          active === "karta" ? "bg-ink text-on-dark" : "hover:bg-ink/5",
        )}
      >
        <Map aria-hidden="true" className="size-4" strokeWidth={2} />
        {t.nav.mapa}
      </Link>
    </nav>
  );
}
