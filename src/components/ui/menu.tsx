"use client";

// WP-47: liten dropdown-meny (profilmenyn i PageHeader/UserPill, "…"-menyn i AgendaRow).
// Radix Popover (redan en dependency, se agenda/event-popover.tsx) i stället för
// @radix-ui/react-dropdown-menu (ingen ny dependency, "befintliga komponenter"). Bara
// tokens, samma yta som EventPopover (`rounded-panel bg-surface shadow-popover`).
import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "./cn";

export type MenuProps = {
  /** Triggerelementet (knapp), t.ex. `<UserPill .../>` eller `<IconButton .../>`. */
  trigger: ReactNode;
  /** Tillgängligt namn på menyns innehåll (aria-label på `Popover.Content`). */
  label: string;
  children: ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
};

export function Menu({
  trigger,
  label,
  children,
  align = "end",
  side = "bottom",
}: MenuProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          side={side}
          sideOffset={8}
          collisionPadding={12}
          aria-label={label}
          className="z-20 flex w-56 flex-col gap-0.5 rounded-panel bg-surface p-1.5 shadow-popover"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

const itemClassName =
  "flex h-11 w-full shrink-0 items-center gap-2.5 rounded-control px-3 text-14 font-semibold text-ink no-underline transition-colors duration-150 ease-out hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none";

export type MenuLinkItemProps = ComponentPropsWithoutRef<typeof Link> & {
  icon?: ReactNode;
};

/** Menypost som navigerar (riktig länk, `next/link`). */
export function MenuLinkItem({
  icon,
  className,
  children,
  ...props
}: MenuLinkItemProps) {
  return (
    <Popover.Close asChild>
      <Link className={cn(itemClassName, className)} {...props}>
        {icon}
        {children}
      </Link>
    </Popover.Close>
  );
}

export type MenuButtonItemProps = ComponentPropsWithoutRef<"button"> & {
  icon?: ReactNode;
};

/** Menypost som kör en handling i klienten (`onClick`), t.ex. att öppna en dialog. */
export function MenuButtonItem({
  icon,
  className,
  children,
  type = "button",
  ...props
}: MenuButtonItemProps) {
  return (
    <Popover.Close asChild>
      <button type={type} className={cn(itemClassName, className)} {...props}>
        {icon}
        {children}
      </button>
    </Popover.Close>
  );
}

export type MenuFormItemProps = {
  /** Server action (t.ex. `logout`, `src/app/auth/actions.ts`) — riktig `<form
   * action={action}>`, fungerar utan JS (regel "riktiga knappar och länkar"). */
  action: () => void | Promise<void>;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Menypost som skickar ett formulär mot en server action, t.ex. "Cerrar sesión". */
export function MenuFormItem({
  action,
  icon,
  children,
  className,
}: MenuFormItemProps) {
  return (
    <form action={action}>
      <Popover.Close asChild>
        <button type="submit" className={cn(itemClassName, className)}>
          {icon}
          {children}
        </button>
      </Popover.Close>
    </form>
  );
}
