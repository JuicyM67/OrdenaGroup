// Loggan: lime-cirkeln (`LogoMark`) + varumärkesnamnet i löptext. Namnet skrivs aldrig
// ut här (regel 10) — det hämtas ur `brand.name`. Används i headern, mobilmenyn och
// footern (samma komponent, olika `size`).
import { cn } from "@/components/ui/cn";
import { LogoMark } from "@/components/ui/logo-mark";
import { brand } from "@/config/brand";

export type BrandLogoSize = "sm" | "lg";

const TEXT_SIZE: Record<BrandLogoSize, string> = {
  sm: "text-19",
  lg: "text-32 sm:text-44",
};

const ICON_SIZE: Record<BrandLogoSize, 40 | 56> = {
  sm: 40,
  lg: 56,
};

export type BrandLogoProps = {
  /** `sm`: headern och mobilmenyn. `lg`: den stora centrerade varumärkestexten i footern. */
  size?: BrandLogoSize;
  /** Sätts när en omgivande länk/rubrik redan har det tillgängliga namnet. */
  decorative?: boolean;
  className?: string;
};

export function BrandLogo({
  size = "sm",
  decorative = false,
  className,
}: BrandLogoProps) {
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
