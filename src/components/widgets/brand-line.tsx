// WP-82 (D-067): den lilla raden "Reservas con {marca}" längst ned i varje widget. Visas
// på alla planer och kan inte döljas. Namnet kommer från brand (regel 10); länken går till
// vår startsida på vårt eget ursprung (relativ länk i iframen, ingen hårdkodad domän).
import { cn } from "@/components/ui/cn";
import { brand } from "@/config/brand";
import { href } from "@/config/routes";
import { widgets } from "@/i18n";
import type { WidgetTheme } from "@/lib/validation/widgets";

export function WidgetBrandLine({
  theme,
  className,
}: {
  theme: WidgetTheme;
  className?: string;
}) {
  const text = widgets.visitante.pie({ marca: brand.name });
  const dark = theme === "dark";
  return (
    <p
      className={cn(
        "text-12",
        dark ? "text-on-dark-muted" : "text-muted",
        className,
      )}
    >
      <a
        href={href("inicio")}
        target="_blank"
        rel="noopener"
        className={cn(
          "rounded-badge underline-offset-2 transition-colors duration-150 ease-out hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:transition-none",
          dark
            ? "hover:text-on-dark focus-visible:outline-lime"
            : "hover:text-ink focus-visible:outline-ink",
        )}
      >
        {text}
      </a>
    </p>
  );
}
