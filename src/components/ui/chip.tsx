// Statisk etikett, inte klickbar (StatusChip m.fl.), se DESIGN.md §7. Inget eget visuellt
// utsnitt (för liten yta) — kontrolleras med beräknade stilar i e2e och i katalogen.
import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "./cn";

const chip = cva("inline-flex w-fit items-center justify-center font-bold", {
  variants: {
    tone: {
      success: "bg-success-bg text-success-fg",
      deposit: "bg-deposit-bg text-deposit-fg",
      pending: "bg-pending-bg text-pending-fg",
      neutral: "bg-canvas text-ink",
      dark: "bg-dark-2 text-on-dark-soft",
      peach: "bg-peach text-ink",
      "peach-50": "bg-peach-50 text-ink",
      lime: "bg-lime text-ink",
      // WP-40 (`falt-A-bokningsformular.html`): "gäller för"-chippen på en
      // bokningsfråga (tjänster/kategorier den gäller för).
      lavender: "bg-lavender text-on-lilac-soft",
      ink: "bg-ink text-on-dark",
      // WP-57 (ägarens UX-genomgång, Hoy: "40 min de atraso syns knappt" → röd chip i
      // stället för grå text). Ny bakgrundston `--color-alert-bg`, se tokens.css.
      // CI-fynd (axe, color-contrast): `text-alert` gav bara 3:1 mot `bg-alert-bg` (fet
      // 12px, inte "stor text", kräver 4,5:1) — `text-alert-fg` är en mörkare, egen -fg-ton
      // för just chippen (se tokens.css), samma mönster som success/deposit/pending.
      alert: "bg-alert-bg text-alert-fg",
    },
    size: {
      md: "rounded-event px-3 py-1.5 text-12",
      sm: "rounded-chip px-2.5 py-1.25 text-12 font-semibold",
      xs: "rounded-badge px-2 py-1 text-11",
      tag: "rounded-tag px-1.5 py-0.5 text-10 tracking-caps uppercase",
      // Main "bajando": trend-chip i StatTile.
      trend: "rounded-chip px-2 py-1 text-12",
      // Reserva "−20%": flash-bricka i TimeSlot.
      badge: "rounded-badge px-1.5 py-0.5 text-11",
    },
    // Måste stå efter `size` i den här listan: cva bygger klasssträngen i variant-ordning,
    // och `cn()` (tailwind-merge) låter den sista klassen i samma grupp vinna. Så vinner
    // `font-bold` (weight="bold") alltid över t.ex. sm:s `font-semibold`.
    weight: {
      default: "",
      bold: "font-bold",
    },
  },
  compoundVariants: [
    // Reserva-headerns taggar ("Lun–Sáb · 10:00–19:00") har padding 6×10 i stället för 5×10.
    { size: "sm", tone: "dark", class: "py-1.5" },
  ],
  defaultVariants: {
    tone: "neutral",
    size: "md",
    weight: "default",
  },
});

export type ChipProps = VariantProps<typeof chip> & {
  children: ReactNode;
  className?: string;
};

export function Chip({ tone, size, weight, children, className }: ChipProps) {
  return (
    <span className={cn(chip({ tone, size, weight }), className)}>
      {children}
    </span>
  );
}
