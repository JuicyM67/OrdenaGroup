"use client";

// Se DESIGN.md §7 "NavRail". Sammansatt komponent: NavRail + NavRailLogo/Link/Action/
// Divider/Spacer. Bredd 80, alltid på mörk yta (data-surface="dark" sätts på <nav>, så
// children kan använda `on-dark:`-varianten för t.ex. fokusring).
// "use client": React Context (NavRailVariantContext) kräver en klientkomponent.
import Link from "next/link";
import { createContext, use, type ReactNode } from "react";

import { LogoMark } from "./logo-mark";
import { cn } from "./cn";
import { IconButton, type IconButtonProps } from "./icon-button";
import { Tooltip } from "./tooltip";

type NavRailVariant = "bare" | "panel";

const NavRailVariantContext = createContext<NavRailVariant>("bare");

export type NavRailProps = {
  variant: NavRailVariant;
  "aria-label": string;
  children: ReactNode;
  className?: string;
};

export function NavRail({
  variant,
  "aria-label": ariaLabel,
  children,
  className,
}: NavRailProps) {
  return (
    <NavRailVariantContext value={variant}>
      <nav
        aria-label={ariaLabel}
        data-surface="dark"
        className={cn(
          "flex w-20 shrink-0 flex-col items-center",
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
};

export function NavRailLink({
  href,
  label,
  icon,
  active = false,
  prefetch,
}: NavRailLinkProps) {
  return (
    // WP-47 (tillägg A): tooltip vid hover, samma `label` som aria-label — bara visuellt.
    <Tooltip label={label}>
      <Link
        href={href}
        prefetch={prefetch}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex size-13 items-center justify-center rounded-control transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none on-dark:focus-visible:outline-lime",
          active ? "bg-dark-2 text-lime" : "text-on-dark-subtle",
        )}
      >
        {icon}
      </Link>
    </Tooltip>
  );
}

export type NavRailFormActionProps = {
  /** Server action (t.ex. `logout`, `src/app/auth/actions.ts`) — riktig
   * `<form action={action}>`, fungerar utan JS (regel "riktiga knappar och länkar"). */
  action: () => void | Promise<void>;
  label: string;
  icon: ReactNode;
};

/** Samma yta/beteende som `NavRailLink`, men en formulärknapp i stället för en länk
 * (WP-47: "Cerrar sesión", som inte navigerar till en sida). */
export function NavRailFormAction({
  action,
  label,
  icon,
}: NavRailFormActionProps) {
  return (
    <Tooltip label={label}>
      <form action={action}>
        <button
          type="submit"
          aria-label={label}
          className="flex size-13 items-center justify-center rounded-control text-on-dark-subtle transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none on-dark:focus-visible:outline-lime"
        >
          {icon}
        </button>
      </form>
    </Tooltip>
  );
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
      <IconButton tone="dark-2" size={56} shape={shape} label={label} {...props} />
    </Tooltip>
  );
}

export function NavRailDivider() {
  return <div aria-hidden="true" className="my-1.5 h-px w-10 bg-dark-line" />;
}

export function NavRailSpacer() {
  return <div className="flex-1" />;
}
