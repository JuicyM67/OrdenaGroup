// Se DESIGN.md §7 för mått per variant/storlek. `asChild` (Radix Slot) låter samma stil
// användas på <a>/Link. React 19: ref tas emot som vanlig prop, ingen forwardRef.
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";

import { cn } from "./cn";

const button = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:transition-none focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-40 on-dark:focus-visible:outline-lime",
  {
    variants: {
      variant: {
        primary: "bg-ink font-bold text-on-dark",
        secondary: "border border-border bg-surface font-semibold text-ink",
        accent: "bg-lime font-bold text-ink",
        "outline-dark":
          "border border-dark-border bg-transparent font-semibold text-on-dark",
        inverse: "bg-surface font-bold tracking-caps text-ink uppercase",
        // Glaset i det flytande navet (WP-hemsida v2, retro 2026-09-28, punkt 2):
        // halvtransparent i stället för secondary (helt vit), så bakgrunden syns igenom.
        glass:
          "border border-surface/60 bg-surface/50 font-semibold text-ink backdrop-blur-glass",
      },
      size: {
        xs: "h-7.5 rounded-full px-3.5 text-12",
        sm: "h-10 rounded-event px-4 text-13",
        md: "h-11 rounded-full px-5 text-13",
        lg: "h-11.5 rounded-control px-5.5 text-14",
        xl: "h-12 rounded-control px-6 text-15",
        "2xl": "h-13 rounded-icon px-5.5 text-15",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "lg",
    },
  },
);

export type ButtonProps = VariantProps<typeof button> &
  Omit<ComponentPropsWithoutRef<"button">, "type"> & {
    type?: "button" | "submit" | "reset";
    asChild?: boolean;
    ref?: Ref<HTMLButtonElement>;
    children?: ReactNode;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ref,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const typeProp = asChild ? {} : { type };
  return (
    <Comp
      ref={ref}
      className={cn(button({ variant, size }), className)}
      {...typeProp}
      {...props}
    />
  );
}
