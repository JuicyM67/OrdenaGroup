// Rubrik + etikett för sektionerna på nya startsidan (WP-71, "Foto-berättelse"): liten
// vit/lavendel etikett, stor rubrik där sista raden ligger på en lime-markering.
// Källa: docs/design/reference/startsida/SidaP3.dc.html + Flytt.dc.html.
import { cn } from "@/components/ui/cn";
import { Highlight } from "@/components/marketing/highlight";

export function HomeHeading({
  etiqueta,
  pre,
  marca,
  chip = "surface",
  className,
  size = "lg",
}: {
  etiqueta: string;
  pre: string;
  marca: string;
  chip?: "surface" | "lavender";
  className?: string;
  size?: "lg" | "md";
}) {
  return (
    <div className={cn("flex flex-col items-start gap-4.5", className)}>
      <span
        className={cn(
          "rounded-chip px-3 py-1.75 text-13 font-bold tracking-label",
          chip === "lavender"
            ? "bg-lavender text-pending-fg"
            : "bg-surface text-ink",
        )}
      >
        {etiqueta}
      </span>
      <h2
        className={cn(
          "font-display leading-none font-semibold tracking-headline text-balance",
          size === "lg" ? "text-36 sm:text-56" : "text-36 sm:text-52",
        )}
      >
        {pre}
        <Highlight>{marca}</Highlight>
      </h2>
    </div>
  );
}
