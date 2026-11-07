// Flikarna i Descubre (WP-85, D-070): Negocios · Ofertas · Horas flash. Vanliga
// länkar (ingen klient-JS); orten och sökningen följer med mellan flikarna.
import { Building2, Tag, Zap } from "lucide-react";
import Link from "next/link";

import { cn } from "@/components/ui/cn";
import { descubre } from "@/i18n";

import { discoverHref, flashHref, type DiscoverParams } from "./params";

const t = descubre.pestanas;

export type DiscoverTab = "negocios" | "ofertas" | "flash";

export function DiscoverTabs({
  active,
  params,
}: {
  active: DiscoverTab;
  params: DiscoverParams;
}) {
  const keep: DiscoverParams = {
    ...(params.q ? { q: params.q } : {}),
    ...(params.ort ? { ort: params.ort } : {}),
  };
  const tabs = [
    {
      id: "negocios",
      label: t.negocios,
      href: discoverHref(keep),
      icon: Building2,
    },
    {
      id: "ofertas",
      label: t.ofertas,
      href: discoverHref(keep, undefined, "ofertas"),
      icon: Tag,
    },
    {
      id: "flash",
      label: t.flash,
      href: flashHref(keep),
      icon: Zap,
    },
  ] as const;

  return (
    <nav aria-label={t.label}>
      <ul className="flex gap-1 rounded-full bg-surface p-1.5 sm:w-fit sm:gap-1.5">
        {tabs.map((tab) => {
          const on = tab.id === active;
          return (
            <li key={tab.id} className="flex-1 sm:flex-none">
              <Link
                href={tab.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center justify-center gap-1.5 rounded-full px-2 text-13 font-bold whitespace-nowrap transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:gap-2 sm:px-5 sm:text-14",
                  on ? "bg-ink text-on-dark" : "text-ink hover:bg-canvas",
                )}
              >
                <tab.icon
                  aria-hidden="true"
                  className={cn(
                    "size-4 shrink-0",
                    on && tab.id === "flash" ? "fill-lime text-lime" : "",
                    on && tab.id !== "flash" ? "text-lime" : "",
                  )}
                  strokeWidth={2}
                />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
