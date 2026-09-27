// Se DESIGN.md §7 "FeatureCard" (progress) och docs/tasks/plans/WP-11.md §4 steg 4. SVG i
// stället för en `<div style="width:…">`, eftersom lint förbjuder `style` i
// src/components/ (D-021: style bara för geometri, ägs av WP-12). Talet finns redan i
// metatexten (t.ex. "3 personas · sábado") — stapeln är `aria-hidden`.
export type ProgressBarProps = {
  /** 0–1. */
  value: number;
  className?: string;
};

export function ProgressBar({ value, className }: ProgressBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <svg aria-hidden="true" width="100%" height="4" className={className}>
      <rect width="100%" height="4" rx="2" className="fill-ink/18" />
      <rect width={`${pct}%`} height="4" rx="2" className="fill-ink" />
    </svg>
  );
}
