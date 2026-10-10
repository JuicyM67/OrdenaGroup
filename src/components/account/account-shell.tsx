// WP-67 (D-054): ram för kundkontots inloggade sidor (Min profil, Bokningar,
// Favoriter, Integritet, Recension). Mobil: innehåll på `bg-canvas` och en mörk
// bottenmeny (referens `Profil.dc.html`). Dator: glas-toppbar med samma
// flikar. Flikarna Upptäck/Karta (WP-68) visas först när marknadsplatsen finns
// — den här ramen ersätts då av WP-68:s `ConsumerShell` (önskemål i PR:en).
// Serverkomponent, ingen klient-JS.
import { CalendarDays, Heart, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/marketing/brand-logo";
import { cuentaHref, href, type CuentaRouteId } from "@/config/routes";
import { cuenta } from "@/i18n";

export type AccountTab = "reservas" | "favoritos" | "perfil";

const TABS: readonly {
  id: AccountTab;
  route: CuentaRouteId;
  icon: LucideIcon;
}[] = [
  { id: "reservas", route: "cuentaReservas", icon: CalendarDays },
  { id: "favoritos", route: "cuentaFavoritos", icon: Heart },
  { id: "perfil", route: "cuenta", icon: UserRound },
];

export function AccountShell({
  active,
  children,
}: {
  active: AccountTab | null;
  children: ReactNode;
}) {
  const t = cuenta.nav;
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="sticky top-0 z-20 hidden bg-canvas/80 backdrop-blur-glass lg:block">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-6 px-8">
          <Link
            href={href("inicio")}
            className="flex h-11 shrink-0 items-center rounded-full border border-surface/60 bg-surface/80 px-3 shadow-glass focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <BrandLogo size="sm" badge decorative />
          </Link>
          <nav
            aria-label={t.aria}
            className="flex items-center gap-1 rounded-full bg-dark p-1.5"
          >
            {TABS.map(({ id, route, icon: Icon }) => {
              const on = id === active;
              return (
                <Link
                  key={id}
                  href={cuentaHref(route)}
                  aria-current={on ? "page" : undefined}
                  className={`flex h-10 items-center gap-2 rounded-full px-4 text-14 font-semibold transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime ${
                    on
                      ? "bg-lime text-ink"
                      : "text-on-dark-soft hover:text-on-dark"
                  }`}
                >
                  <Icon className="size-4" strokeWidth={2} aria-hidden="true" />
                  {t[id]}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 pt-5 pb-32 sm:px-8 lg:pt-6 lg:pb-16">
        {children}
      </div>

      <nav
        aria-label={t.aria}
        className="fixed inset-x-3 bottom-4 z-30 flex h-17 items-center justify-around rounded-bar bg-ink lg:hidden"
      >
        {TABS.map(({ id, route, icon: Icon }) => {
          const on = id === active;
          return (
            <Link
              key={id}
              href={cuentaHref(route)}
              aria-current={on ? "page" : undefined}
              className={`flex min-w-16 flex-col items-center gap-1 text-11 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime ${
                on ? "text-lime" : "text-on-dark-muted"
              }`}
            >
              <Icon className="size-5.5" strokeWidth={2} aria-hidden="true" />
              {t[id]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
