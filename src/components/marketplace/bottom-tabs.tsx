// Bottenmenyn i Upptäck på mobil (WP-68, Main.dc.html): mörk flytande bar.
// Bokningar/Profil går till kundkontot (WP-67, `getConsumerNav`).
import { CalendarDays, Map, Search, User } from "lucide-react";
import Link from "next/link";

import { cn } from "@/components/ui/cn";
import { hrefMarketplace } from "@/config/routes";
import { descubre } from "@/i18n";

import type { ConsumerNav } from "./consumer-session";

const t = descubre;

export function BottomTabs({
  active,
  nav,
}: {
  active: "descubre" | "mapa";
  nav: ConsumerNav;
}) {
  const reservas = nav.links.find((l) => l.id === "reservas");
  const perfil = nav.links.find((l) => l.id === "perfil");
  const items = [
    {
      id: "descubre",
      href: hrefMarketplace("descubre"),
      label: t.tabs.descubre,
      icon: Search,
    },
    {
      id: "mapa",
      href: hrefMarketplace("descubreMapa"),
      label: t.tabs.mapa,
      icon: Map,
    },
    ...(reservas
      ? [
          {
            id: "reservas",
            href: reservas.href,
            label: t.tabs.reservas,
            icon: CalendarDays,
          },
        ]
      : []),
    ...(perfil
      ? [{ id: "perfil", href: perfil.href, label: t.tabs.perfil, icon: User }]
      : []),
  ];
  return (
    <nav
      aria-label={t.tabs.label}
      className="fixed inset-x-4 bottom-safe-b z-30 lg:hidden"
    >
      <ul className="mx-auto flex h-17 max-w-md items-center justify-around rounded-bar bg-ink px-2 text-on-dark shadow-float-md">
        {items.map((it) => {
          const on = it.id === active;
          return (
            <li key={it.id}>
              <Link
                href={it.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-event px-4 py-1.5 text-12 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime",
                  on ? "text-lime" : "text-on-dark-soft hover:text-on-dark",
                )}
              >
                <it.icon
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={2}
                />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
