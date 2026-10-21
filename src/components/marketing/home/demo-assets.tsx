// Bilder för demoföretaget (Estudio Brisa, `brand.demoSlug`),
// delade av flytt-, showcase- och hero-förhandsvisningarna på startsidan (WP-71).
import Image from "next/image";

import { cn } from "@/components/ui/cn";
import { copy } from "@/i18n/marketing";

export const DEMO_DIR = "/demo/cl";

export function DemoCover({
  sizes,
  className,
  loading,
}: {
  sizes: string;
  className?: string;
  /** "eager" där bilden visas mitt i en animation (flytt-demot) så att den inte laddas sent. */
  loading?: "eager" | "lazy";
}) {
  return (
    <Image
      src={`${DEMO_DIR}/cover.webp`}
      alt=""
      fill
      sizes={sizes}
      loading={loading}
      className={cn("object-cover", className)}
    />
  );
}

export function DemoLogo({ className }: { className?: string }) {
  return (
    <Image
      src={`${DEMO_DIR}/logo.svg`}
      alt={copy.home.demo.logoAlt}
      width={160}
      height={160}
      unoptimized
      className={cn("block size-full", className)}
    />
  );
}

export function DemoStaff({
  n,
  className,
  size,
}: {
  n: 1 | 2 | 3 | 4;
  className?: string;
  size: number;
}) {
  return (
    <Image
      src={`${DEMO_DIR}/staff-${n}.webp`}
      alt=""
      width={size}
      height={size}
      className={cn("object-cover", className)}
    />
  );
}
