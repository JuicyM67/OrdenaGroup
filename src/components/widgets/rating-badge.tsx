// WP-82 (D-067): reseñas-märket. Stjärnor + snitt + antal reseñas, och längst ned den lilla
// varumärkesraden. Serverkomponent (inget JS i iframen utom storleksrapporten). Genomskinlig
// yta: texten är `ink` på ljust och `on-dark` på mörkt tema.
import { Stars } from "@/components/reviews/stars";
import { formatAverage } from "@/components/reviews/public-reviews";
import { cn } from "@/components/ui/cn";
import { widgets } from "@/i18n";
import type { WidgetSize, WidgetTheme } from "@/lib/validation/widgets";

import { WidgetBrandLine } from "./brand-line";

const SCORE: Record<WidgetSize, string> = {
  small: "text-22",
  medium: "text-30",
  large: "text-38",
};
const COUNT: Record<WidgetSize, string> = {
  small: "text-12",
  medium: "text-13",
  large: "text-15",
};
const STAR: Record<WidgetSize, "sm" | "md" | "lg"> = {
  small: "sm",
  medium: "md",
  large: "lg",
};

export function RatingBadge({
  average,
  count,
  theme,
  size,
  href,
}: {
  average: number;
  count: number;
  theme: WidgetTheme;
  size: WidgetSize;
  /** Länk till företagets reseñas. Utan `href` är märket bara text. */
  href?: string;
}) {
  const dark = theme === "dark";
  const promedio = formatAverage(average);
  const body = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "font-display leading-none font-semibold tracking-display",
          SCORE[size],
        )}
      >
        {promedio}
      </span>
      <span className="flex flex-col gap-1">
        <Stars
          rating={average}
          size={STAR[size]}
          tone={dark ? "dark" : "light"}
          label={widgets.visitante.resenas.aria({ promedio, n: count })}
        />
        <span
          aria-hidden="true"
          className={cn(COUNT[size], dark ? "text-on-dark-soft" : "text-muted")}
        >
          {widgets.visitante.resenas.cantidad({ n: count })}
        </span>
      </span>
    </>
  );
  const rowClass = "flex items-center gap-3";
  return (
    <div className="flex flex-col items-start gap-2 py-1">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener"
          className={cn(
            rowClass,
            "rounded-chip focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink",
            dark && "focus-visible:outline-lime",
          )}
        >
          {body}
        </a>
      ) : (
        <div className={rowClass}>{body}</div>
      )}
      <WidgetBrandLine theme={theme} />
    </div>
  );
}
