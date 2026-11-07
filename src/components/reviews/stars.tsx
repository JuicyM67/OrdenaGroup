// Stars — WP-65 (D-045): visning av ett betyg (1–5) som fem stjärnor.
// Ingen "use client": renderas på servern på `/[slug]` (JS-budgeten, D-039)
// och återanvänds i ägarens vy. Monokromt (ink/subtle) — inga nya
// färgtokens.
import { Star } from "lucide-react";

import { cn } from "@/components/ui/cn";

export function Stars({
  rating,
  label,
  className,
  size = "sm",
  tone = "light",
}: {
  /** 1–5, får vara ett snitt (4.6 → fyra fyllda). */
  rating: number;
  /** Tillgänglig text ("4 de 5 estrellas"); stjärnorna själva är dekorativa. */
  label: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** `dark` = på mörk yta (widgets, WP-82): lime stjärnor. */
  tone?: "light" | "dark";
}) {
  const filled = Math.round(rating);
  const iconSize =
    size === "lg" ? "size-7" : size === "md" ? "size-4.5" : "size-3.5";
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          strokeWidth={1.8}
          className={cn(
            iconSize,
            n <= filled
              ? tone === "dark"
                ? "fill-lime text-lime"
                : "fill-ink text-ink"
              : tone === "dark"
                ? "fill-none text-on-dark-faint"
                : "fill-none text-subtle",
          )}
        />
      ))}
    </span>
  );
}
