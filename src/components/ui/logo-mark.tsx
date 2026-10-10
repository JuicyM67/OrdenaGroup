// Egen SVG (cirkel med fylld nederhalva), se DESIGN.md §6/§7. Enda komponenten som inte
// använder lucide-react. Ritas i en lime-ruta med radie `icon` (18px), storlek 56 som standard.
import { market } from "@/config/brand";

import { BbMark } from "./bb-mark";
import { cn } from "./cn";

export type LogoMarkProps = {
  /** Tillgängligt namn, t.ex. märkesnamnet (kommer från props, inte hårdkodat här). */
  label: string;
  /** Sidostorlek i px. Standard 56 (`size-14`). */
  size?: 40 | 44 | 56;
  /** Sätts när en omgivande länk/knapp redan har det tillgängliga namnet. */
  decorative?: boolean;
  className?: string;
};

const boxSizeClass: Record<NonNullable<LogoMarkProps["size"]>, string> = {
  40: "size-10",
  44: "size-11",
  56: "size-14",
};

const glyphSizeClass: Record<NonNullable<LogoMarkProps["size"]>, string> = {
  40: "size-5",
  44: "size-6",
  56: "size-6.5",
};

export function LogoMark({
  label,
  size = 56,
  decorative = false,
  className,
}: LogoMarkProps) {
  if (market === "SE") {
    // SE: b-klockan fritt på ytan (D-049), ingen lime-ruta. Ritas lite större än CL:s
    // glyf så att stammen fyller den klickbara rutan.
    return (
      <span
        role={decorative ? undefined : "img"}
        aria-hidden={decorative ? "true" : undefined}
        aria-label={decorative ? undefined : label}
        className={cn(
          "inline-flex shrink-0 items-center justify-center",
          boxSizeClass[size],
          className,
        )}
      >
        <BbMark className="size-full" />
      </span>
    );
  }

  return (
    <span
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? "true" : undefined}
      aria-label={decorative ? undefined : label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-icon bg-lime text-ink",
        boxSizeClass[size],
        className,
      )}
    >
      <svg
        className={glyphSizeClass[size]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12a8.5 8.5 0 0 0 17 0z" fill="currentColor" />
      </svg>
    </span>
  );
}
