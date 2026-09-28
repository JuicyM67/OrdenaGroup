// Rubrik delad av alla sektioner på sitio-webben (landningen och undersidorna): samma
// klasser som landningens tidigare lokala `SECTION_TITLE`-konstant (WP-hemsida). Valfri
// `subtitle` (t.ex. Precios: "Precios en CLP al mes...") sätts under rubriken, samma
// mönster som `landing.precios.subtitulo` hade inline på landningen innan utbrytningen.
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

export function SectionHeading({
  title,
  subtitle,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <h2 className="font-display text-30 font-bold tracking-display text-ink sm:text-32">
        {title}
      </h2>
      {subtitle ? (
        <p className="max-w-2xl text-15 text-muted">{subtitle}</p>
      ) : null}
    </div>
  );
}
