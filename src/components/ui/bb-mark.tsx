// WP-74 (D-049): SE-märket "b-klockan" — ett gement b vars rundel är en urtavla.
// Geometrin är kopierad ur docs/design/brand/bb-mark.svg (viewBox 64). Färger via tokens:
// kropp = ink (vit på mörk yta), visare = flash-dot (lime på mörk yta). Tonen väljs
// antingen automatiskt från närmaste `data-surface="dark"` (on-dark:-varianten) eller
// explicit med `tone`.
import { cn } from "./cn";

export type BbMarkTone = "auto" | "light" | "dark";

const BODY: Record<BbMarkTone, string> = {
  auto: "text-ink on-dark:text-on-dark",
  light: "text-ink",
  dark: "text-on-dark",
};

const HANDS: Record<BbMarkTone, string> = {
  auto: "text-flash-dot on-dark:text-lime",
  light: "text-flash-dot",
  dark: "text-lime",
};

export type BbMarkProps = {
  tone?: BbMarkTone;
  /** Storleksklass, t.ex. `size-7`. */
  className?: string;
};

export function BbMark({ tone = "auto", className }: BbMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", BODY[tone], className)}
    >
      <rect x="10" y="4" width="11" height="54" rx="5.5" fill="currentColor" />
      <circle cx="36" cy="40" r="14.5" stroke="currentColor" strokeWidth="10" />
      <path
        d="M36 33v7l5 3.5"
        className={HANDS[tone]}
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
