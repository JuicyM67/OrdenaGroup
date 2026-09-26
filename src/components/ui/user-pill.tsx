// Se DESIGN.md §7 "PageHeader" → UserPill. Höjd 48, avatar 36, ChevronDown. Bara knappen —
// menyn (dropdown) är inte del av WP-02 (se idélistan i WP-02-planen, WP-15).
import { ChevronDown } from "lucide-react";
import type { ComponentPropsWithoutRef, Ref } from "react";

import { Avatar, type AvatarProps } from "./avatar";
import { cn } from "./cn";

export type UserPillProps = Omit<ComponentPropsWithoutRef<"button">, "type"> & {
  type?: "button" | "submit" | "reset";
  name: string;
  initials: string;
  avatarTone?: AvatarProps["tone"];
  ref?: Ref<HTMLButtonElement>;
};

export function UserPill({
  name,
  initials,
  avatarTone = "lilac",
  className,
  type = "button",
  ref,
  ...props
}: UserPillProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "flex h-12 items-center gap-2.5 rounded-full bg-surface py-0 pr-4 pl-1.5 text-14 font-semibold text-ink transition-colors duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none on-dark:focus-visible:outline-lime",
        className,
      )}
      {...props}
    >
      <Avatar initials={initials} tone={avatarTone} size={36} />
      {name}
      <ChevronDown aria-hidden="true" className="size-4" strokeWidth={2} />
    </button>
  );
}
