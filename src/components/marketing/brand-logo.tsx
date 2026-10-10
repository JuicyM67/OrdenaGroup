// Logga per marknad. CL behåller den befintliga lime-cirkeln (`LogoMark`) + varumärkesnamnet
// i löptext. SE använder b-klockan (`BbMark`) + ordmärket "booking" "buddy" (D-049,
// DESIGN.md "Logotyp SE"). Namnet skrivs aldrig ut här (regel 10) — orden hämtas ur
// `brand.name`. Används i headern, mobilmenyn och footern (samma komponent, olika `size`).
import { cn } from "@/components/ui/cn";
import { BbMark, type BbMarkTone } from "@/components/ui/bb-mark";
import { LogoMark } from "@/components/ui/logo-mark";
import { brand, market } from "@/config/brand";

export type BrandLogoSize = "sm" | "lg";

const TEXT_SIZE: Record<BrandLogoSize, string> = {
  sm: "text-19",
  lg: "text-32 sm:text-44",
};

const ICON_SIZE: Record<BrandLogoSize, 40 | 56> = {
  sm: 40,
  lg: 56,
};

const BB_MARK_SIZE: Record<BrandLogoSize, string> = {
  sm: "size-7",
  lg: "size-12 sm:size-16",
};

/** SE-ordmärket (D-049): b-klockan + "booking" (600) och "buddy" (800) i en rad, tät
 * spärrning. Orden hämtas ur `brand.name` (regel 10), skrivs med gemener. Tonen följer
 * `on-dark:` automatiskt om inget annat anges. */
function BbWordmark({
  size,
  variant,
  tone,
  badge,
}: {
  size: BrandLogoSize;
  variant: BrandLogoVariant;
  tone: BbMarkTone;
  badge: boolean;
}) {
  const words = brand.name.toLowerCase().split(" ");
  const first = words[0] ?? brand.name;
  const rest = words.slice(1).join(" ");
  const textTone =
    tone === "light"
      ? "text-ink"
      : tone === "dark"
        ? "text-on-dark"
        : "text-ink on-dark:text-on-dark";
  return (
    <>
      {badge ? (
        <span className="flex size-9 flex-none items-center justify-center rounded-full bg-ink">
          <BbMark tone="dark" className="size-5.5" />
        </span>
      ) : (
        <BbMark tone={tone} className={BB_MARK_SIZE[size]} />
      )}
      {variant === "full" ? (
        <span
          className={cn(
            "font-display tracking-headline",
            textTone,
            TEXT_SIZE[size],
          )}
        >
          <span className="font-semibold">{first}</span>
          {rest ? <span className="font-extrabold">{rest}</span> : null}
        </span>
      ) : null}
    </>
  );
}

export type BrandLogoVariant = "full" | "mark";

export type BrandLogoProps = {
  /** `full`: märke + ordmärke. `mark`: bara märket (SE). */
  variant?: BrandLogoVariant;
  /** `auto` (standard) följer omgivande yta; `light`/`dark` tvingar färgerna. */
  tone?: BbMarkTone;
  /** `sm`: headern och mobilmenyn. `lg`: den stora centrerade varumärkestexten i footern. */
  size?: BrandLogoSize;
  /** Sätts när en omgivande länk/rubrik redan har det tillgängliga namnet. */
  decorative?: boolean;
  /** SE: märket i en mörk cirkel (som appikonen), används i headern. */
  badge?: boolean;
  className?: string;
};

export function BrandLogo({
  variant = "full",
  tone = "auto",
  size = "sm",
  decorative = false,
  badge = false,
  className,
}: BrandLogoProps) {
  if (market === "SE") {
    return (
      <span
        role={variant === "mark" && !decorative ? "img" : undefined}
        aria-label={variant === "mark" && !decorative ? brand.name : undefined}
        className={cn("inline-flex items-center gap-2", className)}
      >
        <BbWordmark size={size} variant={variant} tone={tone} badge={badge} />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark
        label={brand.name}
        size={ICON_SIZE[size]}
        decorative={decorative}
      />
      <span
        className={cn(
          "font-display font-bold tracking-display text-ink on-dark:text-on-dark",
          TEXT_SIZE[size],
        )}
      >
        {brand.name}
      </span>
    </span>
  );
}
