import { cn } from "@/components/ui/cn";

// Se DESIGN.md §7 "FeatureCard" (progress) och docs/tasks/plans/WP-11.md §4 steg 4. SVG i
// stället för en `<div style="width:…">`, eftersom lint förbjuder `style` i
// src/components/ (D-021: style bara för geometri, ägs av WP-12). Talet finns redan i
// metatexten (t.ex. "3 personas · sábado") — stapeln är `aria-hidden`.
export type ProgressBarProps = {
  /** 0–1. */
  value: number;
  className?: string;
  /** WP-92: `lime` på mörk yta (onboardingens stegpanel), tjockare stapel. */
  tone?: "ink" | "lime";
};

export function ProgressBar({
  value,
  className,
  tone = "ink",
}: ProgressBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const h = tone === "lime" ? 8 : 4;
  return (
    <svg aria-hidden="true" width="100%" height={h} className={className}>
      <rect
        width="100%"
        height={h}
        rx={h / 2}
        className={tone === "lime" ? "fill-on-dark/15" : "fill-ink/18"}
      />
      <rect
        width={`${pct}%`}
        height={h}
        rx={h / 2}
        className={cn(
          "transition-all duration-500 ease-out",
          tone === "lime" ? "fill-lime" : "fill-ink",
        )}
      />
    </svg>
  );
}
