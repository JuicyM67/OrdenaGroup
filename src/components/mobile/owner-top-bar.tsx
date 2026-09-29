// WP-42: kompakt mörk topprad för ägarens app-skal på < lg (AppShell/AgendaShell), när
// sidomenyn (NavRail/AgendaRail) döljs. Logga + varumärkesnamn (`src/config/brand.ts`,
// hård regel 10 — namnet finns bara där) och en "Cerrar sesión"-genväg (samma
// oanslutna platshållare som `MainNav`s `NavRailLink href="#cerrar-sesion"`, WP-15).
import { LogOut } from "lucide-react";
import Link from "next/link";

import { brand } from "@/config/brand";
import { nav } from "@/i18n";

import { IconButton } from "@/components/ui/icon-button";
import { LogoMark } from "@/components/ui/logo-mark";

export function OwnerMobileTopBar() {
  return (
    <header
      data-surface="dark"
      className="flex shrink-0 items-center justify-between gap-3 bg-ink px-5 py-3 pt-safe-t lg:hidden"
    >
      <span className="flex items-center gap-2.5">
        <LogoMark label={nav.volverAlInicio} size={40} decorative />
        <span className="text-15 font-bold text-on-dark">{brand.name}</span>
      </span>
      <IconButton label={nav.cerrarSesion} tone="ghost-dark" size={44} asChild>
        <Link href="#cerrar-sesion" prefetch={false}>
          <LogOut aria-hidden="true" className="size-5" strokeWidth={1.9} />
        </Link>
      </IconButton>
    </header>
  );
}
