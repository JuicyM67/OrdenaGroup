// WP-87 (D-073, port av SE WP-77/D-058): tarjetan som kort — företagsnamn +
// "Tarjeta de regalo" överst, beloppet stort, giltighet längst ned. Två
// designer i salongen: Lima och Lila. Ren presentation (server och klient).
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

export type GiftCardPreviewTheme = "lime" | "lilac";

export function giftCardThemeClass(theme: GiftCardPreviewTheme): string {
  return theme === "lime" ? "bg-lime text-ink" : "bg-lilac text-ink";
}

export function GiftCardPreview({
  theme,
  businessName,
  label,
  amount,
  to,
  footer,
  size = "lg",
  className,
}: {
  theme: GiftCardPreviewTheme;
  businessName: string;
  label: string;
  amount: string;
  to?: string | undefined;
  footer?: ReactNode;
  size?: "lg" | "md";
  className?: string;
}) {
  const lg = size === "lg";
  return (
    <div
      className={cn(
        "relative isolate flex flex-col justify-between overflow-hidden shadow-popover print:shadow-none",
        lg
          ? "min-h-60 gap-4.5 rounded-card p-6.5"
          : "min-h-42.5 gap-3 rounded-tile p-5",
        giftCardThemeClass(theme),
        className,
      )}
    >
      <div className="relative flex items-start justify-between gap-3">
        <span
          className={cn(
            "font-display font-extrabold",
            lg ? "text-18" : "text-16",
          )}
        >
          {businessName}
        </span>
        <span
          className={cn(
            "font-bold tracking-caps uppercase opacity-80",
            lg ? "text-12" : "text-11",
          )}
        >
          {label}
        </span>
      </div>
      <div className="relative flex flex-col gap-1">
        {to ? <span className="text-14 opacity-85">{to}</span> : null}
        <span
          className={cn(
            "font-display leading-none font-extrabold tracking-display",
            lg ? "text-56" : "text-44",
          )}
        >
          {amount}
        </span>
      </div>
      {footer ? (
        <span className="relative text-12 opacity-80">{footer}</span>
      ) : null}
    </div>
  );
}
