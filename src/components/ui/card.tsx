// Platt yta, aldrig border eller skugga (DESIGN.md §1/§4). Mörka toner sätter
// data-surface="dark" så att children kan använda variant-prefixet `on-dark:` (globals.css).
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef, Ref } from "react";

import { cn } from "./cn";

const card = cva("", {
  variants: {
    tone: {
      surface: "bg-surface text-ink fields-on-surface",
      dark: "bg-dark text-on-dark",
      "dark-2": "bg-dark-2 text-on-dark",
      lilac: "bg-lilac text-ink",
      peach: "bg-peach text-ink",
      lime: "bg-lime text-ink",
    },
    radius: {
      card: "rounded-card",
      tile: "rounded-tile",
      hero: "rounded-hero",
    },
    padding: {
      md: "px-5.5 py-5",
      lg: "p-5.5",
      xl: "p-8",
      none: "",
    },
  },
  defaultVariants: {
    tone: "surface",
    radius: "card",
    padding: "md",
  },
});

export type CardProps = VariantProps<typeof card> &
  ComponentPropsWithoutRef<"div"> & {
    as?: "div" | "section" | "article";
    ref?: Ref<HTMLElement>;
  };

const darkTones = new Set(["dark", "dark-2"]);

export function Card({
  as,
  tone,
  radius,
  padding,
  className,
  children,
  ref,
  ...props
}: CardProps) {
  const Comp = as ?? "div";
  const isDark = darkTones.has(tone ?? "surface");
  return (
    <Comp
      // Comp varierar (div/section/article) beroende på `as`, men ref-typen i vår publika
      // API är medvetet den gemensamma HTMLElement — riktiga DOM-noden matchar `as` ändå.
      ref={ref as Ref<HTMLDivElement>}
      data-surface={isDark ? "dark" : undefined}
      className={cn(card({ tone, radius, padding }), className)}
      {...props}
    >
      {children}
    </Comp>
  );
}
