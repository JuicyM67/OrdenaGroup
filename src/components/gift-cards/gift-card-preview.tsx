// WP-77 (D-058): presentkortet som kort (designen `presentkort/Main.dc.html`):
// företagsnamn + "Presentkort" överst, beloppet stort, giltighet längst ned.
// Tre designer: Lime, Lila och Foto (företagets omslagsbild under en mörk
// toning; utan bild ett mörkt kort). Ren presentation — används både av
// köpformuläret (klient) och av server-sidorna.
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

export type GiftCardTheme = "lime" | "lilac" | "photo";

export function giftCardThemeClass(theme: GiftCardTheme): string {
  return theme === "lime"
    ? "bg-lime text-ink"
    : theme === "lilac"
      ? "bg-lilac text-ink"
      : "bg-dark text-on-dark";
}

/** Fotobakgrunden (bara Foto): omslagsbilden under en mörk toning. */
export function GiftCardPhoto({ src }: { src: string | null }) {
  return (
    <>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- dekor, redan optimerad i bucketen
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-br from-ink/65 to-ink/20"
      />
    </>
  );
}

export function GiftCardPreview({
  theme,
  photoUrl,
  businessName,
  label,
  amount,
  to,
  footer,
  size = "lg",
  className,
}: {
  theme: GiftCardTheme;
  photoUrl: string | null;
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
        "relative isolate flex flex-col justify-between overflow-hidden shadow-popover",
        lg
          ? "min-h-60 gap-4.5 rounded-card p-6.5"
          : "min-h-42.5 gap-3 rounded-tile p-5",
        giftCardThemeClass(theme),
        className,
      )}
    >
      {theme === "photo" ? <GiftCardPhoto src={photoUrl} /> : null}
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
