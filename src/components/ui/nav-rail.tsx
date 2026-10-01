"use client";

// Se DESIGN.md §7 "NavRail". Sammansatt komponent: NavRail + NavRailLogo/Link/Action/
// Divider/Spacer. Bredd 80, alltid på mörk yta (data-surface="dark" sätts på <nav>, så
// children kan använda `on-dark:`-varianten för t.ex. fokusring).
// "use client": React Context (NavRailVariantContext) kräver en klientkomponent.
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import Link from "next/link";
import { createContext, use, type ReactNode } from "react";

import { LogoMark } from "./logo-mark";
import { cn } from "./cn";
import { IconButton, type IconButtonProps } from "./icon-button";
import { Tooltip } from "./tooltip";
import { uxTextos } from "@/i18n";

type NavRailVariant = "bare" | "panel";

const NavRailVariantContext = createContext<NavRailVariant>("bare");

export type NavRailProps = {
  variant: NavRailVariant;
  "aria-label": string;
  children: ReactNode;
  className?: string;
  /**
   * WP-57 (punkt 2, UX-genomgång "Menyn med etiketter"): `true` (standard, oförändrat
   * beteende) = bara ikoner, 80 px bred. `false` = etiketter bredvid ikonerna (via
   * `NavRailLink`/`NavRailFormAction`s egen `collapsed`-prop), ~208 px bred
   * (`useNavCollapsed`, `use-nav-collapsed.ts`). Bara `MainNav` och `AgendaRail`s
   * nav-länkar skickar `false` — övrig användning (t.ex. `settings/ajustes-shell.tsx`,
   * design lab) behåller det gamla, smala läget utan att ändra sin egen kod.
   */
  collapsed?: boolean;
};

export function NavRail({
  variant,
  "aria-label": ariaLabel,
  children,
  className,
  collapsed = true,
}: NavRailProps) {
  return (
    <NavRailVariantContext value={variant}>
      <nav
        aria-label={ariaLabel}
        data-surface="dark"
        className={cn(
          "flex shrink-0 flex-col",
          collapsed ? "w-20 items-center" : "w-52 items-stretch px-2",
          variant === "bare"
            ? "gap-3 py-3"
            : "gap-3.5 rounded-card bg-dark py-3.5",
          className,
        )}
      >
        {children}
      </nav>
    </NavRailVariantContext>
  );
}

export function NavRailLogo({ label, href }: { label: string; href?: string }) {
  const variant = use(NavRailVariantContext);
  const wrapperClassName = variant === "bare" ? "mb-5" : undefined;
  if (!href) {
    return (
      <div className={wrapperClassName}>
        <LogoMark label={label} />
      </div>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "rounded-icon focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none on-dark:focus-visible:outline-lime",
        wrapperClassName,
      )}
    >
      <LogoMark label={label} decorative />
    </Link>
  );
}

export type NavRailLinkProps = {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  /**
   * `false` för länkar till sidor som inte finns än (t.ex. `/app/clientes` i WP-11–14, se
   * respektive plans §2): Next.js prefetchar annars länkar i viewport per default, vilket
   * ger ständiga 404-RSC-förfrågningar som aldrig blir "networkidle" i `npm run visual`.
   */
  prefetch?: boolean;
  /**
   * WP-57 (punkt 2): `true` (standard) = kvadratisk ikonknapp med hover-tooltip (oförändrat
   * beteende). `false` = full bredd, etiketten synlig bredvid ikonen i stället för i en
   * tooltip (texten är redan synlig, ingen tooltip behövs då).
   */
  collapsed?: boolean;
};

export function NavRailLink({
  href,
  label,
  icon,
  active = false,
  prefetch,
  collapsed = true,
}: NavRailLinkProps) {
  const link = (
    <Link
      href={href}
      prefetch={prefetch}
      aria-label={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center rounded-control transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none on-dark:focus-visible:outline-lime",
        collapsed
          ? "size-13 justify-center"
          : "h-13 w-full gap-3 px-3.5 text-14 font-semibold",
        active ? "bg-dark-2 text-lime" : "text-on-dark-subtle",
      )}
    >
      {icon}
      {collapsed ? null : <span className="truncate">{label}</span>}
    </Link>
  );
  // WP-47 (tillägg A): tooltip vid hover när bara ikonen syns — etiketten är redan
  // `aria-label` på länken (regel "riktiga knappar"). WP-57: ingen tooltip när etiketten
  // redan är synlig bredvid ikonen (`collapsed=false`), annars samma text två gånger.
  return collapsed ? <Tooltip label={label}>{link}</Tooltip> : link;
}

export type NavRailFormActionProps = {
  /** Server action (t.ex. `logout`, `src/app/auth/actions.ts`) — riktig
   * `<form action={action}>`, fungerar utan JS (regel "riktiga knappar och länkar"). */
  action: () => void | Promise<void>;
  label: string;
  icon: ReactNode;
  /** WP-57 (punkt 2): se `NavRailLink`. */
  collapsed?: boolean;
};

/** Samma yta/beteende som `NavRailLink`, men en formulärknapp i stället för en länk
 * (WP-47: "Cerrar sesión", som inte navigerar till en sida). */
export function NavRailFormAction({
  action,
  label,
  icon,
  collapsed = true,
}: NavRailFormActionProps) {
  const button = (
    <form action={action} className={collapsed ? undefined : "w-full"}>
      <button
        type="submit"
        aria-label={collapsed ? label : undefined}
        className={cn(
          "flex items-center rounded-control text-on-dark-subtle transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none on-dark:focus-visible:outline-lime",
          collapsed
            ? "size-13 justify-center"
            : "h-13 w-full gap-3 px-3.5 text-14 font-semibold",
        )}
      >
        {icon}
        {collapsed ? null : <span className="truncate">{label}</span>}
      </button>
    </form>
  );
  return collapsed ? <Tooltip label={label}>{button}</Tooltip> : button;
}

export type NavRailActionProps = Omit<IconButtonProps, "tone" | "size"> & {
  shape?: "circle" | "square";
};

export function NavRailAction({
  shape = "circle",
  label,
  ...props
}: NavRailActionProps) {
  return (
    <Tooltip label={label}>
      <IconButton
        tone="dark-2"
        size={56}
        shape={shape}
        label={label}
        {...props}
      />
    </Tooltip>
  );
}

export function NavRailDivider() {
  return <div aria-hidden="true" className="my-1.5 h-px w-10 bg-dark-line" />;
}

export function NavRailSpacer() {
  return <div className="flex-1" />;
}

/**
 * TODO_COPY (copywriter-es-cl): `nav.ts` saknar ännu etiketter för att fälla ihop/fälla ut
 * menyn — platshållare nedan, nämnt i rapporten till uppdragsgivaren.
 */
const COLLAPSE_LABEL_TODO = uxTextos.minimizarMenu;
const EXPAND_LABEL_TODO = uxTextos.expandirMenu;

export type NavRailCollapseToggleProps = {
  collapsed: boolean;
  onToggle: (next: boolean) => void;
};

/** WP-57 (punkt 2): knappen som fäller ihop/ut `MainNav`/`AgendaRail` (`useNavCollapsed`,
 * `use-nav-collapsed.ts`). Samma yta som `NavRailLink`, men en knapp i stället för en
 * länk. */
export function NavRailCollapseToggle({
  collapsed,
  onToggle,
}: NavRailCollapseToggleProps) {
  const label = collapsed ? EXPAND_LABEL_TODO : COLLAPSE_LABEL_TODO;
  const button = (
    <button
      type="button"
      aria-label={collapsed ? label : undefined}
      onClick={() => onToggle(!collapsed)}
      className={cn(
        "flex items-center rounded-control text-on-dark-subtle transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none on-dark:focus-visible:outline-lime",
        collapsed
          ? "size-13 justify-center"
          : "h-13 w-full gap-3 px-3.5 text-14 font-semibold",
      )}
    >
      {collapsed ? (
        <ChevronsRight aria-hidden="true" className="size-5" strokeWidth={1.8} />
      ) : (
        <ChevronsLeft aria-hidden="true" className="size-5" strokeWidth={1.8} />
      )}
      {collapsed ? null : <span className="truncate">{label}</span>}
    </button>
  );
  return collapsed ? <Tooltip label={label}>{button}</Tooltip> : button;
}
