// Hjälpkomponent till PageHeader (UserPill) och AgendaRow (WP-12). Visar initialer på en
// tonad yta. Se DESIGN.md §7 "PageHeader"/"AgendaRow".
// WP-41: tone="peach" tillagd (Profil, Personal-korten) — redan en token (`--color-peach`),
// bara en ny variant i den här cva:n, ingen ny färg.
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./cn";

const avatar = cva(
  "inline-flex shrink-0 items-center justify-center font-bold text-ink",
  {
    variants: {
      shape: {
        circle: "rounded-full",
        square: "rounded-avatar",
      },
      size: {
        36: "size-9 text-13",
        40: "size-10 text-13",
        46: "size-11.5 text-14",
        56: "size-14 text-16",
      },
      tone: {
        lilac: "bg-lilac",
        "lilac-100": "bg-lilac-100",
        peach: "bg-peach",
        "peach-50": "bg-peach-50",
        "lime-50": "bg-lime-50",
        sky: "bg-sky",
        "staff-1": "bg-staff-1",
        "staff-2": "bg-staff-2",
        "staff-3": "bg-staff-3",
        "staff-4": "bg-staff-4",
        "staff-5": "bg-staff-5",
        "staff-6": "bg-staff-6",
      },
    },
    defaultVariants: {
      shape: "circle",
      size: 36,
      tone: "lilac",
    },
  },
);

export type AvatarProps = VariantProps<typeof avatar> & {
  /** Initialer, t.ex. "CR". Läses upp av skärmläsare om `aria-hidden` inte sätts av föräldern. */
  initials: string;
  className?: string;
};

export function Avatar({
  initials,
  shape,
  size,
  tone,
  className,
}: AvatarProps) {
  return (
    <span className={cn(avatar({ shape, size, tone }), className)}>
      {initials}
    </span>
  );
}
