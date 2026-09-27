// Se DESIGN.md §7. `label` är obligatorisk och blir aria-label (typfel utan den).
// `badge` visar en notisprick (8px, bg-alert) — texten om notiser finns måste stå i `label`.
// `asChild` (Radix Slot) låter samma stil användas på <a>/Link, t.ex. "Compartir hora
// flash". `badge` stöds inte tillsammans med `asChild` (inget kort i designen behöver det).
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";

import { cn } from "./cn";

const iconButton = cva(
  "relative inline-flex shrink-0 items-center justify-center transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:transition-none focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-40 on-dark:focus-visible:outline-lime",
  {
    variants: {
      tone: {
        surface: "bg-surface text-ink",
        canvas: "bg-canvas text-ink",
        ink: "bg-ink text-on-dark",
        "dark-2": "bg-dark-2 text-on-dark",
        ghost: "bg-transparent text-ink",
        "ghost-dark": "bg-transparent text-on-dark-soft",
      },
      size: {
        30: "size-7.5",
        32: "size-8",
        34: "size-8.5",
        44: "size-11",
        46: "size-11.5",
        48: "size-12",
        56: "size-14",
      },
      shape: {
        circle: "rounded-full",
        square: "rounded-icon",
      },
    },
    defaultVariants: {
      tone: "surface",
      size: 48,
      shape: "circle",
    },
  },
);

type IconButtonVariants = VariantProps<typeof iconButton>;

export type IconButtonProps = Omit<ComponentPropsWithoutRef<"button">, "type"> &
  IconButtonVariants & {
    type?: "button" | "submit" | "reset";
    /** Obligatorisk: blir aria-label. Nämn notisen här om `badge` är satt. */
    label: string;
    badge?: boolean;
    asChild?: boolean;
    ref?: Ref<HTMLButtonElement>;
    children?: ReactNode;
  };

export function IconButton({
  className,
  tone,
  size,
  shape,
  label,
  badge = false,
  asChild = false,
  type = "button",
  ref,
  children,
  ...props
}: IconButtonProps) {
  const Comp = asChild ? Slot : "button";
  const typeProp = asChild ? {} : { type };
  return (
    <Comp
      ref={ref}
      aria-label={label}
      className={cn(iconButton({ tone, size, shape }), className)}
      {...typeProp}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {children}
          {badge ? (
            <span
              aria-hidden="true"
              className="absolute top-2.75 right-3 size-2 rounded-full bg-alert"
            />
          ) : null}
        </>
      )}
    </Comp>
  );
}
