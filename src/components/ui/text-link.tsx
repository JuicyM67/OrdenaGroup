// Se DESIGN.md §7 "TextLink". Tunn wrapper runt next/link för textlänkar i brödtext,
// t.ex. "Ver agenda" (Main). Referensen: `a{color:#16161A}a:hover{color:#4B3AA8}`,
// understrykningen är webbläsarens standard (ingen text-decoration i referensen).
import Link, { type LinkProps } from "next/link";
import type { ComponentPropsWithoutRef, Ref } from "react";

import { cn } from "./cn";

export type TextLinkProps = ComponentPropsWithoutRef<"a"> &
  LinkProps & {
    ref?: Ref<HTMLAnchorElement>;
  };

export function TextLink({ className, ref, ...props }: TextLinkProps) {
  return (
    <Link
      ref={ref}
      className={cn(
        "text-13 font-semibold text-ink underline transition-colors duration-150 ease-out hover:text-pending-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none on-dark:focus-visible:outline-lime",
        className,
      )}
      {...props}
    />
  );
}
