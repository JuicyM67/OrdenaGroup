// Ram för /admin (WP-91): vänster ikonmeny med runda knappar (aktiv = mörk med
// lime-ikon) i appens designspråk, sidhuvud med titel och åtgärder. Mobil: samma
// knappar som en rad överst. Serverkomponent. Används per sida EFTER
// `requireAdminPage()` — inte i layouten, så att menyn aldrig visas för någon som
// får 404.
import {
  LayoutGrid,
  MessageSquareText,
  Plus,
  ScrollText,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import { LogoMark } from "@/components/ui/logo-mark";
import { brand } from "@/config/brand";
import { adminPanel } from "@/i18n";

const t = adminPanel.nav;

export type AdminSection = "negocios" | "resenas" | "registro" | "admins";

const ITEMS = [
  { id: "negocios", href: "/admin", label: t.negocios, icon: LayoutGrid },
  {
    id: "resenas",
    href: "/admin/resenas",
    label: t.resenas,
    icon: MessageSquareText,
  },
  {
    id: "registro",
    href: "/admin/actividad",
    label: t.registro,
    icon: ScrollText,
  },
  {
    id: "admins",
    href: "/admin/administradores",
    label: t.administradores,
    icon: UserCog,
  },
] as const;

function RailLink({
  item,
  active,
}: {
  item: (typeof ITEMS)[number];
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        active
          ? "bg-ink text-lime"
          : "bg-surface text-ink shadow-soft hover:bg-field",
      )}
    >
      <item.icon aria-hidden="true" className="size-5" strokeWidth={2} />
      <span className="sr-only">{item.label}</span>
    </Link>
  );
}

export function AdminShell({
  active,
  title,
  subtitle,
  actions,
  back,
  children,
}: {
  active: AdminSection;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Länk tillbaka (t.ex. från ett företag till listan). */
  back?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh gap-6 px-4 py-4 sm:px-6 lg:gap-8 lg:py-6">
      <nav
        aria-label={t.label}
        className="sticky top-6 hidden h-fit flex-col items-center gap-3 lg:flex"
      >
        <Link
          href="/admin"
          className="mb-3 flex size-12 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ink"
        >
          <LogoMark label={brand.name} size={40} decorative />
          <span className="sr-only">{t.negocios}</span>
        </Link>
        {ITEMS.map((item) => (
          <RailLink key={item.id} item={item} active={item.id === active} />
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <nav
          aria-label={t.label}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:hidden"
        >
          {ITEMS.map((item) => (
            <RailLink key={item.id} item={item} active={item.id === active} />
          ))}
        </nav>

        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            {back ? (
              <Link
                href={back.href}
                className="w-fit rounded-badge text-13 font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
              >
                ← {back.label}
              </Link>
            ) : null}
            <h1 className="font-display text-34 leading-snug font-semibold tracking-title text-ink">
              {title}
            </h1>
            {subtitle ? (
              <div className="text-14 text-muted">{subtitle}</div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            {active === "negocios" && !back ? (
              <Link
                href="/admin/nuevo"
                className="flex h-11 items-center gap-2 rounded-full bg-ink pr-5 pl-4 text-14 font-bold text-on-dark transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <Plus aria-hidden="true" className="size-4" strokeWidth={2.5} />
                {t.nuevo}
              </Link>
            ) : null}
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
